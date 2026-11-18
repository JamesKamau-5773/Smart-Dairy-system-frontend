import { Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * The phone records toolbar. Row one: search and one Filter button (a small ink count of the
 * filters behind it). Row two: those filters as removable chips, and the backend's record count
 * on the right. `panel` (the existing filter controls) shows under row one while open.
 * Presentational: the page keeps every filter.
 *
 * chips: [{ key, label, onRemove, removeLabel }]
 */
export default function MilkLogPhoneToolbar({
  search,
  onSearch,
  searchLabel,
  searchPlaceholder,
  filterLabel,
  filterCount,
  filterCountLabel,
  filtersOpen,
  onToggleFilters,
  panelId,
  panel,
  chips,
  recordCount,
}) {
  const hasSecondRow = chips.length > 0 || recordCount;
  return (
    <div className="space-y-2 border-b border-ink-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{searchLabel}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-input border border-ink-300 bg-white pl-9 pr-3 text-ink-900 placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-input border border-ink-300 bg-white px-3 text-control text-ink-900 hover:bg-ink-50"
        >
          <SlidersHorizontal size={16} className="text-ink-400" aria-hidden="true" />
          {filterLabel}
          {filterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1.5 text-badge text-white">
              <span aria-hidden="true">{filterCount}</span>
              <span className="sr-only">{filterCountLabel}</span>
            </span>
          )}
        </button>
      </div>

      {filtersOpen && <div id={panelId} className="space-y-3 pt-1">{panel}</div>}

      {hasSecondRow && (
        <div className="flex min-h-9 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                aria-label={chip.removeLabel}
                className="inline-flex max-w-full items-center gap-1.5 !rounded-full border border-ink-300 bg-white px-3 text-badge text-ink-900 hover:bg-ink-50"
              >
                <span className="truncate">{chip.label}</span>
                <X size={14} className="shrink-0 text-ink-500" aria-hidden="true" />
              </button>
            ))}
          </div>
          {recordCount && <p role="status" className="m-0 shrink-0 whitespace-nowrap text-meta text-ink-500">{recordCount}</p>}
        </div>
      )}
    </div>
  );
}
