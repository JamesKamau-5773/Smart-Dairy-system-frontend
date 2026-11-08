import { useState } from 'react';
import DateField from './DateField';

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
      aria-label="Custom date range"
      onSubmit={(event) => {
        event.preventDefault();
        if (canApply) onApply({ from, to });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField label="From" value={from} onChange={setFrom} max={max} inputClassName="input-machined h-10 min-h-0 !py-2 text-sm" />
        <DateField label="To" value={to} onChange={setTo} max={max} inputClassName="input-machined h-10 min-h-0 !py-2 text-sm" />
      </div>
      {reversed && <p role="alert" className="text-xs text-danger-900">The From date must be on or before the To date.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary min-h-11 px-3 text-sm sm:min-h-9">Cancel</button>
        <button type="submit" disabled={!canApply} className="btn-command min-h-11 px-3 text-sm disabled:opacity-50 sm:min-h-9">Apply</button>
      </div>
    </form>
  );
}
