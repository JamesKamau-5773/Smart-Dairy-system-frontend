import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import DateRangeForm from '../ui/DateRangeForm';
import { formatDateRange } from '../../lib/dateFormat';
import { commonCopy } from '../../i18n/common';

/**
 * A toolbar button that opens a dd/mm/yyyy From/To picker. Controlled: the page keeps the
 * range (in the URL) and applies it to the table and the summary together.
 * range: { from, to } as YYYY-MM-DD, or null for every date.
 */
export default function ToolbarDateRange({ range, onChange, maxDate }) {
  const [open, setOpen] = useState(false);
  const label = formatDateRange(range?.from, range?.to) ?? commonCopy.summary.dates;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 !rounded-input border border-ink/15 bg-card px-3 text-control text-ink hover:bg-ink-50 sm:min-h-9"
        >
          <CalendarDays size={14} aria-hidden="true" /> <span className="max-w-[14rem] truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] rounded-input border-ink/10 bg-card p-3">
        <DateRangeForm
          initial={range}
          max={maxDate}
          onCancel={() => setOpen(false)}
          onApply={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
