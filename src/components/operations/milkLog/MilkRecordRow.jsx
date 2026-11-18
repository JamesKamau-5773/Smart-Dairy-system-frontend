import { ChevronRight } from 'lucide-react';
import MilkStatusPill from './MilkStatusPill';
import VsAverageText from './VsAverageText';

/**
 * One milking record on the phone list: one tappable row (opens its details). Cow and time on
 * the left, litres and the change against the cow's average on the right. Presentational: it
 * shows the text it is given.
 */
export default function MilkRecordRow({ cow, time, litres, vsAvg, significantDrop, status, statusLabel, ariaLabel, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className="flex min-h-16 w-full items-center gap-3 !rounded-none border-b border-ink-100 bg-white py-2.5 pl-4 pr-3 text-left transition-colors hover:bg-ink-50 active:bg-ink-50"
    >
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-control text-brand">{cow}</span>
          <MilkStatusPill status={status} label={statusLabel} />
        </span>
        <span className="mt-0.5 block text-meta text-ink-500">{time ?? '—'}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-record-figure text-brand">{litres}</span>
        <VsAverageText vsAvg={vsAvg} significantDrop={significantDrop} className="block text-meta" />
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
    </button>
  );
}
