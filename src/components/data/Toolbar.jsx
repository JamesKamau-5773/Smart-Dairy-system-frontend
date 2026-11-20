import { ChevronDown, Search } from 'lucide-react';
import { commonCopy } from '../../i18n/common';
import { PHONE_QUERY, TABLE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { CONTROL } from './surface';
import { ToolbarLayoutContext, toolbarSlot, useToolbarLayout } from './toolbarLayout';

// The shared filter controls, used inside FilterPanel in the order Search → selects → date
// range (ToolbarDateRange / ToolbarDate). All share one height and border (CONTROL).

/**
 * The filter controls, laid out as one wrapping row ('row', desktop) or a two-column grid with
 * visible labels ('stacked', phones and tablets). By default the screen decides: a row from
 * xl (TABLE_QUERY) up, stacked below it, the same on every page. The controls follow the layout.
 */
export function Toolbar({ children, layout: chosenLayout }) {
  const isWide = useMediaQuery(TABLE_QUERY);
  const layout = chosenLayout ?? (isWide ? 'row' : 'stacked');
  return (
    <ToolbarLayoutContext.Provider value={layout}>
      <div className={layout === 'stacked' ? 'grid min-w-0 grid-cols-2 gap-3' : 'flex min-h-11 min-w-0 flex-wrap items-center gap-2'}>
        {children}
      </div>
    </ToolbarLayoutContext.Provider>
  );
}

/** On a phone the placeholder is just "Search": inputs are 16px there and the page's longer
 * one would be cut off. The label still says what the search covers.
 * `inputRef` lets a page focus the box (e.g. a Cmd+K shortcut). */
export function ToolbarSearch({ label, value, onChange, placeholder, inputRef }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const slot = toolbarSlot(useToolbarLayout(), { wide: true });
  return (
    <label className={slot.wrapper || 'min-w-0 flex-1 basis-48'}>
      <span className={slot.label}>{label}</span>
      <span className="relative block">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input ref={inputRef} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={isPhone ? commonCopy.filters.searchShort : placeholder} className={`${CONTROL} w-full pl-9 pr-3`} />
      </span>
    </label>
  );
}

/** A select styled like the other inputs (no native chrome); options are [value, label]. */
export function ToolbarSelect({ label, value, onChange, options }) {
  const slot = toolbarSlot(useToolbarLayout());
  return (
    <label className={slot.wrapper || 'shrink-0'}>
      <span className={slot.label}>{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`${CONTROL} ${slot.full || 'max-w-[12rem]'} appearance-none truncate pl-3 pr-8`}>
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </span>
    </label>
  );
}

/**
 * An on/off filter ("Show archived") as a checkbox inside a control-sized box, so it lines up
 * with the other controls. `checked` is a boolean.
 */
export function ToolbarToggle({ label, checked, onChange }) {
  const layout = useToolbarLayout();
  return (
    <label className={`${CONTROL} ${layout === 'stacked' ? 'col-span-2' : 'shrink-0'} inline-flex cursor-pointer items-center gap-2 px-3 hover:bg-ink-50`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-brand" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

/**
 * One-tap choices for a filter with few values, each with an optional count ("Milking (12)").
 * Same height and border as the other controls; the chosen one is filled in brand blue.
 * options: [{ value, label, count?, ariaLabel? }]
 */
export function ToolbarPills({ label, value, onChange, options }) {
  const layout = useToolbarLayout();
  const slot = toolbarSlot(layout, { wide: true });
  return (
    <div role="group" aria-label={label} className={slot.wrapper || 'min-w-0'}>
      {layout === 'stacked' && <span className={slot.label} aria-hidden="true">{label}</span>}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {options.map((option) => {
          const chosen = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={chosen}
              aria-label={option.ariaLabel}
              className={`${CONTROL} inline-flex items-center gap-1 px-3 ${chosen ? '!border-brand !bg-brand !text-white' : 'hover:border-brand/30 hover:text-brand'}`}
            >
              {option.label}
              {option.count != null && <span className="tabular-nums">({option.count})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
