import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import AlertBanner from '../ui/AlertBanner';
import Money from '../ui/Money';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { buildCorrectionPayload, correctionChangesSomething, originalCategory, parseCorrectionAmount } from '../../lib/ledgerCorrection';

const COPY = {
  expense: {
    title: 'Correct expense',
    what: 'Expense',
    effect: 'The original entry is voided and a corrected one is posted in its place. Both stay in the ledger.',
  },
  income: {
    title: 'Correct income',
    what: 'Income',
    effect: 'The original entry and its receipt are voided. A corrected entry and a new receipt are issued.',
  },
};

/**
 * Corrects a posted income or expense entry: category, cost class (expenses only)
 * and amount. The page sends it; `error` is the backend's answer when it refused.
 */
export default function LedgerCorrectionModal({ kind, transaction, onClose, onSubmit, isPending, error, tenantId, farmId }) {
  const categories = useLedgerCategories(tenantId, farmId);
  const text = COPY[kind];
  const startCategory = originalCategory(transaction);
  const [category, setCategory] = useState(startCategory);
  const [costClass, setCostClass] = useState(transaction.cost_class || '');
  const [amountText, setAmountText] = useState(String(transaction.amount ?? ''));
  const [reason, setReason] = useState('');

  // The entry's own category is always allowed, even one only a workflow posts.
  const listed = kind === 'income' ? categories.income : categories.expense;
  const options = listed.some(([value]) => value === startCategory) || !startCategory ? listed : [[startCategory, startCategory], ...listed];
  const resolvedCostClass = kind === 'expense' ? categories.resolveCostClass(category, costClass) : null;
  const amount = parseCorrectionAmount(amountText);
  const amountError = amountText.trim() && amount === null ? 'Enter an amount above 0, like 1500 or 1500.50.' : '';
  const changes = { kind, transaction, category, costClass: resolvedCostClass, amount };
  const hasChange = amount !== null && correctionChangesSomething(changes);
  const canSave = hasChange && reason.trim() && !isPending;

  const submit = (event) => {
    event.preventDefault();
    if (canSave) onSubmit(buildCorrectionPayload({ ...changes, reason }));
  };

  return (
    <BaseModal isOpen onClose={isPending ? () => {} : onClose} title={text.title} subtitle={text.effect}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <AlertBanner type="danger" title="Not corrected" message={error} compact />}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface-raised p-3 text-sm">
          <dt className="text-ink-muted">{text.what}</dt>
          <dd className="text-right font-semibold text-ink">{transaction.item_name || transaction.description || transaction.category}</dd>
          <dt className="text-ink-muted">Recorded amount</dt>
          <dd className="text-right font-semibold text-ink"><Money amount={transaction.amount} /></dd>
        </dl>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="form-control">
            <label htmlFor="correction-amount" className="label-text">Amount (KES)</label>
            <input id="correction-amount" value={amountText} onChange={(event) => setAmountText(event.target.value)} inputMode="decimal" className="input-machined tabular-nums" aria-invalid={Boolean(amountError)} aria-describedby="correction-amount-hint" />
            <span id="correction-amount-hint" className="mt-1 block text-xs text-ink-muted">
              {amountError || 'Entries posted by stock, payroll or advances, or split across animals, keep their amount. Correct those at their source.'}
            </span>
          </div>
          <div className="form-control">
            <label htmlFor="correction-category" className="label-text">Category</label>
            <select id="correction-category" value={category} onChange={(event) => setCategory(event.target.value)} className="input-machined" required>
              {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {kind === 'expense' && (
            <div className="form-control sm:col-span-2">
              <label htmlFor="correction-cost-class" className="label-text">Cost class</label>
              <select id="correction-cost-class" value={resolvedCostClass} onChange={(event) => setCostClass(event.target.value)} className="input-machined" required>
                {categories.costClasses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {categories.describe(resolvedCostClass) && <span className="mt-1 block text-xs text-ink-muted">{categories.describe(resolvedCostClass)}</span>}
            </div>
          )}
        </div>

        <div className="form-control">
          <label htmlFor="correction-reason" className="label-text">Reason for the correction</label>
          <textarea id="correction-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="input-machined" rows="2" placeholder="e.g. Typed 1200 instead of 1500" required />
          <span className="mt-1 block text-xs text-ink-muted">Kept with the voided entry so anyone can see why it changed.</span>
        </div>

        {!hasChange && amount !== null && <p className="text-xs text-ink-muted" role="status">Change the amount, category or cost class to correct this entry.</p>}

        <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
          <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={!canSave} className="btn-primary">{isPending ? 'Correcting…' : 'Void and replace'}</button>
        </div>
      </form>
    </BaseModal>
  );
}
