import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import DateRangeForm from '../ui/DateRangeForm';
import { formatDateRange } from '../../lib/dateFormat';
import { CUSTOM_PERIOD } from '../../lib/periodTotals';

const OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const segment = (selected) => `min-h-11 !rounded-badge px-3 text-xs font-semibold sm:min-h-8 ${selected ? 'bg-brand text-white' : 'text-ink-muted hover:text-brand'}`;
const stepButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center !rounded-input text-brand hover:bg-ink-50 disabled:text-ink/20 disabled:hover:bg-transparent sm:h-8 sm:w-8';

/**
 * Week | Month | Year [| Custom] with ‹ label › stepping, as in banking apps. Controlled:
 * the page owns the period. Custom (shown when `onCustomRange` is given) opens a
 * dd/mm/yyyy range picker; it is the page's only date control.
 */
export default function PeriodControl({
  period, label, onPeriodChange, onPrevious, onNext, canGoPrevious, canGoNext,
  customRange, onCustomRange, maxDate,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCustom = period === CUSTOM_PERIOD;
  const shownLabel = isCustom ? formatDateRange(customRange?.from, customRange?.to) : label;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
      <div role="group" aria-label="Period" className={`grid w-full shrink-0 gap-0.5 rounded-input border border-ink/10 bg-ink-50 p-0.5 sm:inline-flex sm:w-auto ${onCustomRange ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {OPTIONS.map((option) => (
          <button key={option.value} type="button" aria-pressed={option.value === period} onClick={() => onPeriodChange(option.value)} className={segment(option.value === period)}>
            {option.label}
          </button>
        ))}
        {onCustomRange && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-pressed={isCustom} aria-haspopup="dialog" className={segment(isCustom)}>Custom</button>
            </PopoverTrigger>
            <PopoverContent align="end" collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] rounded-input border-ink/10 bg-card p-3">
              <DateRangeForm
                initial={customRange}
                max={maxDate}
                onCancel={() => setPickerOpen(false)}
                onApply={(range) => {
                  onCustomRange(range);
                  setPickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:flex-none">
        {!isCustom && (
          <button type="button" onClick={onPrevious} disabled={!canGoPrevious} aria-label="Previous period" className={stepButton}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        )}
        <span className="min-w-0 truncate text-center text-sm font-semibold text-ink" aria-live="polite">{shownLabel ?? '—'}</span>
        {!isCustom && (
          <button type="button" onClick={onNext} disabled={!canGoNext} aria-label="Next period" className={stepButton}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
