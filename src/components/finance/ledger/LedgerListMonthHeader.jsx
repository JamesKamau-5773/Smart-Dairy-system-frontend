import { ChevronDown } from 'lucide-react';
import Money from '../../ui/Money';

/**
 * A month (or, across years, a year) in the phone list: a 52px button that opens and closes
 * it, on a subtle brand tint, with the API's net on the right. `description` names the count
 * and totals for screen readers.
 */
export default function LedgerListMonthHeader({ label, totals, isOpen, onToggle, description, groupKey, tinted = true }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={`${label}, ${description}`}
      data-group-keys={groupKey}
      className={`flex min-h-[52px] w-full min-w-0 items-center gap-2 !rounded-none border-b border-ink/10 px-4 text-left text-body-strong text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 ${tinted ? 'bg-brand-50' : 'bg-card'}`}
    >
      <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-ink-muted transition-transform duration-150 motion-reduce:transition-none ${isOpen ? '' : '-rotate-90'}`} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 whitespace-nowrap">
        {totals?.net == null ? '—' : <Money amount={totals.net} cents="plain" className="text-body-strong" />}
      </span>
    </button>
  );
}
