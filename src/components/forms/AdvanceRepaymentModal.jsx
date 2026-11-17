import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { getApiErrorMessage } from '../../lib/backendApi';
import { todayLocalIso } from '../../lib/localDate';
import { staffCopy } from '../../i18n/staff';

/** Cash an employee paid back outside payroll. The backend checks it against the balance. */
export default function AdvanceRepaymentModal({ staff, onClose, onSubmit }) {
  const copy = staffCopy.repayment;
  const [form, setForm] = useState({ amount: '', date: todayLocalIso(), note: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const amount = Number(form.amount);
  const canSubmit = Number.isFinite(amount) && amount > 0;
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError('');
    try {
      await onSubmit(staff, { amount, date: form.date, note: form.note.trim() });
      onClose();
    } catch (caught) {
      setError(getApiErrorMessage(caught, copy.failed));
    } finally {
      setPending(false);
    }
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.title(staff.name)} subtitle={copy.owes(Number(staff.loanBalance || 0).toLocaleString())}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="repay-amount" className="mb-1.5 block text-field-label text-ink">{copy.amount}</label>
            <input id="repay-amount" type="number" inputMode="decimal" min="0" step="any" value={form.amount} onChange={set('amount')} className="input-machined w-full text-control" />
          </div>
          <div>
            <label htmlFor="repay-date" className="mb-1.5 block text-field-label text-ink">{copy.date}</label>
            <input id="repay-date" type="date" max={todayLocalIso()} value={form.date} onChange={set('date')} className="input-machined w-full text-control" />
          </div>
        </div>
        <div>
          <label htmlFor="repay-note" className="mb-1.5 block text-field-label text-ink">{copy.note}</label>
          <input id="repay-note" value={form.note} onChange={set('note')} placeholder={copy.notePlaceholder} className="input-machined w-full text-control" />
        </div>
        {error && <p role="alert" className="text-body-strong text-danger">{error}</p>}
        <SubmitButton pending={pending} pendingLabel={copy.pending} disabled={!canSubmit}>{copy.submit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
