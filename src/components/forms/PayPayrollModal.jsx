import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { staffCopy } from '../../i18n/staff';

// Saved with the run in the payment reference; only the labels are translated.
const PAYMENT_METHODS = ['M-Pesa', 'Bank transfer', 'Cash'];

/**
 * Last check before money moves: the run's backend totals, how it was paid,
 * and the payment reference (M-Pesa bulk payment or bank batch number).
 */
export default function PayPayrollModal({ run, onClose, onConfirm, isPending }) {
  const copy = staffCopy.payRun;
  const [method, setMethod] = useState('M-Pesa');
  const [reference, setReference] = useState('');
  const needsReference = method !== 'Cash';
  const canPay = !needsReference || reference.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canPay) return;
    onConfirm({ payment_reference: [method, reference.trim()].filter(Boolean).join(': ') });
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.title(run.period)} subtitle={copy.subtitle}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <dl className="grid grid-cols-2 divide-x divide-ink/10 rounded-card border border-ink/10">
          <div className="px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{copy.employees}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">{run.employees}</dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{copy.totalNet}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">KES {Number(run.totalDisbursed || 0).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pay-method" className="mb-1.5 block text-xs font-semibold text-ink">{copy.paidBy}</label>
            <select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value)} className="input-machined w-full text-sm">
              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{copy.methods[value] ?? value}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pay-reference" className="mb-1.5 block text-xs font-semibold text-ink">
              {needsReference ? copy.reference : copy.referenceOptional}
            </label>
            <input
              id="pay-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={method === 'M-Pesa' ? copy.mpesaPlaceholder : method === 'Cash' ? copy.cashPlaceholder : copy.bankPlaceholder}
              className="input-machined w-full text-sm uppercase"
              aria-describedby="pay-reference-hint"
            />
            <p id="pay-reference-hint" className="mt-1 text-xs text-ink-muted">{copy.referenceHint}</p>
          </div>
        </div>

        <SubmitButton pending={isPending} pendingLabel={copy.pending} disabled={!canPay}>
          {copy.submit}
        </SubmitButton>
      </form>
    </BaseModal>
  );
}
