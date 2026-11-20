import { useId, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import DateRangeForm from '../ui/DateRangeForm';
import { formatDateRange } from '../../lib/dateFormat';
import { commonCopy } from '../../i18n/common';
import { CONTROL } from './surface';
import { toolbarSlot, useToolbarLayout } from './toolbarLayout';

/**
 * The date-range filter control: a button showing "01 Jan 2026 – 19 Nov 2026" that opens a
 * dd/mm/yyyy From/To picker. Controlled: the page keeps the
 * range (in the URL) and applies it to the table and the summary together.
 * range: { from, to } as YYYY-MM-DD, or null for every date.
 * label: shown over the button in a stacked Toolbar (default "Date range").
 */
export default function ToolbarDateRange({ range, onChange, maxDate, label = commonCopy.dateRange.rangeLabel }) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const layout = useToolbarLayout();
  const slot = toolbarSlot(layout, { wide: true });
  const text = formatDateRange(range?.from, range?.to) ?? commonCopy.summary.dates;

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-describedby={layout === 'stacked' ? labelId : undefined}
          className={`${CONTROL} ${slot.full} inline-flex shrink-0 items-center !rounded-input px-3 tabular-nums hover:bg-ink-50`}
        >
          <span className="max-w-[14rem] truncate">{text}</span>
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

  if (layout !== 'stacked') return picker;
  return (
    <div className={slot.wrapper}>
      <span id={labelId} className={slot.label}>{label}</span>
      {picker}
    </div>
  );
}
