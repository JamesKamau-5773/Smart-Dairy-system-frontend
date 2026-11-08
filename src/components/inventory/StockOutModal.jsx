import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import SubmitButton from '../auth/SubmitButton';
import { feedCopy } from '../../i18n/feed.en';
import { getFeedErrorMessage } from '../../lib/feedErrors';
import { EMPTY_STOCK_OUT, STOCK_OUT_REASONS, isWriteOff, validateStockOut } from '../../lib/stockChangeForm';

const { stockOut: copy } = feedCopy;
const fieldClass = 'w-full rounded-lg border border-ink/15 bg-card p-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-ink-muted';

/** Use or write off stock. The parent mounts it per opening, so state starts clean. */
export default function StockOutModal({ item, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_STOCK_OUT);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [pending, setPending] = useState(false);
  const stock = Number(item.stock?.value ?? item.currentStock ?? 0);
  const unit = item.stock?.unit ?? item.unit ?? 'units';

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateStockOut(form, stock);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    setSubmitError('');
    try {
      await onSubmit(item, form);
      onClose();
    } catch (error) {
      setSubmitError(getFeedErrorMessage(error, copy.failed));
    } finally {
      setPending(false);
    }
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.title} subtitle={copy.subtitle(item.name, stock, unit)}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="stock-out-reason" className={labelClass}>{copy.reason}</label>
          <select id="stock-out-reason" value={form.reason} onChange={(event) => setField('reason', event.target.value)} className={fieldClass}>
            {STOCK_OUT_REASONS.map(({ value }) => <option key={value} value={value}>{copy.reasons[value]}</option>)}
          </select>
          {isWriteOff(form.reason) && <p className="mt-1.5 text-xs text-ink-muted">{copy.writeOffNote}</p>}
        </div>

        <div>
          <label htmlFor="stock-out-quantity" className={labelClass}>{`${copy.quantity} (${unit})`}</label>
          <input
            id="stock-out-quantity"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(event) => setField('quantity', event.target.value)}
            aria-invalid={errors.quantity ? true : undefined}
            className={fieldClass}
          />
          {errors.quantity && <p className="mt-1 text-xs font-semibold text-danger">{errors.quantity}</p>}
        </div>

        <div>
          <label htmlFor="stock-out-notes" className={labelClass}>{copy.notes}</label>
          <input id="stock-out-notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder={copy.notesPlaceholder} className={fieldClass} />
        </div>

        {submitError && <p role="alert" className="text-xs font-semibold text-danger">{submitError}</p>}
        <SubmitButton pending={pending} pendingLabel={copy.submitting}>{copy.submit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
