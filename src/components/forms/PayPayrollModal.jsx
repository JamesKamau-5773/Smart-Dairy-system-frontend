import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';

const PAYMENT_METHODS = ['M-Pesa', 'Bank transfer', 'Cash'];

/**
 * Last check before money moves: the run's backend totals, how it was paid,
 * and the payment reference (M-Pesa bulk payment or bank batch number).
 */
export default function PayPayrollModal({ run, onClose, onConfirm, isPending }) {
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
    <BaseModal isOpen onClose={onClose} title={`Pay ${run.period} payroll`} subtitle="Record this only after the money has been sent.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <dl className="grid grid-cols-2 divide-x divide-ink/10 rounded-card border border-ink/10">
          <div className="px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Employees</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">{run.employees}</dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Total net pay</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">KES {Number(run.totalDisbursed || 0).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pay-method" className="mb-1.5 block text-xs font-semibold text-ink">Paid by</label>
            <select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value)} className="input-machined w-full text-sm">
              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pay-reference" className="mb-1.5 block text-xs font-semibold text-ink">
              {needsReference ? 'Payment reference' : 'Reference (optional)'}
            </label>
            <input
              id="pay-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={method === 'M-Pesa' ? 'Bulk payment or transaction code' : method === 'Cash' ? 'e.g. signed pay sheet' : 'Bank batch or transfer number'}
              className="input-machined w-full text-sm uppercase"
              aria-describedby="pay-reference-hint"
            />
            <p id="pay-reference-hint" className="mt-1 text-xs text-ink-muted">Kept with the run so anyone can trace the payment later.</p>
          </div>
        </div>

        <SubmitButton pending={isPending} pendingLabel="Recording payment…" disabled={!canPay}>
          Record as paid
        </SubmitButton>
      </form>
    </BaseModal>
  );
}
