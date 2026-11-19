import { useId, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toolbarSlot, useToolbarLayout } from './toolbarLayout';
import DateField from '../ui/DateField';
import { formatDate } from '../../lib/dateFormat';
import { commonCopy } from '../../i18n/common';
import { CONTROL } from './surface';

const copy = commonCopy.dateRange;

/**
 * The one-day filter control, for pages that filter by a single date: a button showing
 * "18 Nov 2026" (or "Any day") that opens a dd/mm/yyyy field with a calendar, the same field
 * the date-range control uses. Controlled: `value` is YYYY-MM-DD, or '' for any day.
 */
export default function ToolbarDate({ value, onChange, maxDate, label = copy.day }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const labelId = useId();
  const layout = useToolbarLayout();
  const slot = toolbarSlot(layout, { wide: true });
  const choose = (next) => {
    onChange(next);
    setOpen(false);
  };

  const picker = (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-describedby={layout === 'stacked' ? labelId : undefined}
          className={`${CONTROL} ${slot.full} inline-flex shrink-0 items-center !rounded-input px-3 tabular-nums hover:bg-ink-50`}
        >
          <span className="max-w-[14rem] truncate">{value ? formatDate(value) : copy.anyDay}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-[min(18rem,calc(100vw-2rem))] rounded-input border-ink/10 bg-card p-3">
        <form
          className="space-y-3"
          aria-label={copy.dayLabel}
          onSubmit={(event) => {
            event.preventDefault();
            if (draft) choose(draft);
          }}
        >
          <DateField label={copy.day} value={draft} onChange={setDraft} max={maxDate} inputClassName="input-machined h-10 min-h-0 !py-2" />
          <div className="flex justify-end gap-2">
            {value && <button type="button" onClick={() => choose('')} className="btn-ghost mr-auto min-h-11 px-3 text-control sm:min-h-9">{copy.clear}</button>}
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary min-h-11 px-3 text-control sm:min-h-9">{copy.cancel}</button>
            <button type="submit" disabled={!draft} className="btn-command min-h-11 px-3 text-control disabled:opacity-50 sm:min-h-9">{copy.apply}</button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );

  if (layout !== 'stacked') return picker;
  return (
    <div className={slot.wrapper}>
      <span id={labelId} className={slot.label}>{label}</span>
      {picker}
    </div>
  );
}
