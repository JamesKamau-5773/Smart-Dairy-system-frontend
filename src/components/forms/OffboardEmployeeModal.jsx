import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { getApiErrorMessage } from '../../lib/backendApi';
import { todayLocalIso } from '../../lib/localDate';
import { OFFBOARDING_REASONS, hasAppAccount } from '../../lib/staffLabels';
import { tone } from '../ui/tones';

const fieldClass = 'input-machined w-full text-sm';
const labelClass = 'mb-1.5 block text-xs font-semibold text-ink';

/**
 * Marks someone as former staff with a last working day and a reason. Records
 * are kept for payroll and audit; nothing is deleted. The parent mounts it per
 * opening, so the form starts clean.
 */
export default function OffboardEmployeeModal({ staff, onClose, onSubmit }) {
  const [form, setForm] = useState({ end_date: todayLocalIso(), reason: 'RESIGNED', note: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const hasLoan = Number(staff.loanBalance) > 0;
  // The backend requires a note when the reason is "Other".
  const needsNote = form.reason === 'OTHER';
  const canSubmit = !hasLoan && (!needsNote || form.note.trim().length > 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError('');
    try {
      await onSubmit(staff, form);
      onClose();
    } catch (caught) {
      setError(getApiErrorMessage(caught, `${staff.name} was not offboarded. Try again.`));
    } finally {
      setPending(false);
    }
  };

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  return (
    <BaseModal isOpen onClose={onClose} title={`Offboard ${staff.name}`} subtitle="They move to former staff. Their payroll and history are kept.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {hasLoan && (
          <p role="alert" className={`rounded-card border p-3 text-sm text-ink ${tone('critical').border} ${tone('critical').surface}`}>
            {staff.name} still owes KES {Number(staff.loanBalance).toLocaleString()} in advances. Clear the balance before offboarding.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="offboard-end-date" className={labelClass}>Last working day</label>
            <input id="offboard-end-date" type="date" max={todayLocalIso()} value={form.end_date} onChange={set('end_date')} className={fieldClass} required />
          </div>
          <div>
            <label htmlFor="offboard-reason" className={labelClass}>Reason</label>
            <select id="offboard-reason" value={form.reason} onChange={set('reason')} className={fieldClass}>
              {OFFBOARDING_REASONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="offboard-note" className={labelClass}>{needsNote ? 'Note (required for "Other")' : 'Note (optional)'}</label>
          <textarea id="offboard-note" rows={2} value={form.note} onChange={set('note')} className={fieldClass} />
        </div>

        {hasAppAccount(staff.accountStatus) && (
          <p className="text-xs text-ink-muted">{staff.name} can sign in to the app. Offboarding turns off their login and app access.</p>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}

        <SubmitButton pending={pending} pendingLabel="Offboarding…" disabled={!canSubmit}>Offboard</SubmitButton>
      </form>
    </BaseModal>
  );
}
