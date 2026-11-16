import { ChevronDown, Search, X } from 'lucide-react';
import { formatCount } from '../../lib/numberFormat';
import { commonCopy } from '../../i18n/common';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

const CONTROL = 'h-9 min-h-0 rounded-input border border-ink/15 bg-card text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

/** Search, filters and chips on the left; the result count pinned right. */
export function Toolbar({ children, end }) {
  return (
    <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-2">
      {children}
      {end && <div className="ml-auto shrink-0 pl-2">{end}</div>}
    </div>
  );
}

/** On a phone the placeholder is just "Search": inputs are 16px there and the page's longer
 * one would be cut off. The label still says what the search covers. */
export function ToolbarSearch({ label, value, onChange, placeholder }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  return (
    <label className="relative min-w-0 flex-1 basis-48">
      <span className="sr-only">{label}</span>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={isPhone ? commonCopy.filters.searchShort : placeholder} className={`${CONTROL} w-full pl-9 pr-3`} />
    </label>
  );
}

/** A select styled like the other inputs (no native chrome); options are [value, label]. */
export function ToolbarSelect({ label, value, onChange, options }) {
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${CONTROL} max-w-[12rem] appearance-none truncate pl-3 pr-8 font-medium`}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </label>
  );
}

/** Active filters as removable chips, and Reset only while any is active. */
export function FilterChips({ chips, onReset }) {
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={commonCopy.filters.remove(chip.label)}
          className="inline-flex min-h-11 max-w-[14rem] items-center gap-1 !rounded-full border border-ink/10 bg-ink-50 px-2.5 text-xs font-medium text-ink hover:border-ink/20 sm:min-h-7"
        >
          <span className="truncate">{chip.label}</span> <X size={12} aria-hidden="true" className="shrink-0" />
        </button>
      ))}
      <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-ink-muted hover:text-brand sm:min-h-9">
        {commonCopy.filters.reset}
      </button>
    </>
  );
}

/** "9 records"; "—" when the API didn't say. */
export function ResultCount({ count, noun: [singular, plural] }) {
  return (
    <p role="status" className="whitespace-nowrap text-xs text-ink-muted">
      <span>{formatCount(count)}</span> {count === 1 ? singular : plural}
    </p>
  );
}
