import { useState } from 'react';
import DateField from './DateField';
import { commonCopy } from '../../i18n/common';

const copy = commonCopy.dateRange;

/**
 * From/To dates (dd/mm/yyyy) with Apply and Cancel. Hands back { from, to } as
 * YYYY-MM-DD only when both are real dates and From is not after To.
 */
export default function DateRangeForm({ initial, max, onApply, onCancel }) {
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  // ISO dates compare correctly as text; no date maths.
  const reversed = Boolean(from && to && from > to);
  const canApply = Boolean(from && to && !reversed);

  return (
    <form
      className="space-y-3"
      aria-label={copy.label}
      onSubmit={(event) => {
        event.preventDefault();
        if (canApply) onApply({ from, to });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField label={copy.from} value={from} onChange={setFrom} max={max} inputClassName="input-machined h-10 min-h-0 !py-2" />
        <DateField label={copy.to} value={to} onChange={setTo} max={max} inputClassName="input-machined h-10 min-h-0 !py-2" />
      </div>
      {reversed && <p role="alert" className="text-meta text-danger-900">{copy.reversed}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary min-h-11 px-3 text-control sm:min-h-9">{copy.cancel}</button>
        <button type="submit" disabled={!canApply} className="btn-command min-h-11 px-3 text-control disabled:opacity-50 sm:min-h-9">{copy.apply}</button>
      </div>
    </form>
  );
}
