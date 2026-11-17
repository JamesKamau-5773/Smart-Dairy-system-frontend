import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { SURFACE } from '../data/surface';
import { HISTORY_FILTERS, activeHistoryFilterCount } from '../../lib/breedingHistory';

/**
 * Search and status filters for Historical Checks, folded behind "Show filters".
 * Controlled: the caller owns `filter`, `search` and `open`.
 */
export default function BreedingHistoryFilters({ filter, search, open, onFilterChange, onSearchChange, onToggle }) {
  const activeCount = activeHistoryFilterCount(filter, search);
  const clear = () => {
    onFilterChange('All');
    onSearchChange('');
  };

  return (
    <div className={`${SURFACE} p-4`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            <Search size={12} aria-hidden="true" /> Search and filters
          </div>
          <p className="mt-1 text-sm text-ink-muted">Filter breeding history by record status, cow name, or ear tag.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-ink/10 bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
            {activeCount} active
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-ink/15 bg-card px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            {open ? 'Hide filters' : 'Show filters'}
            {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-ink/10 pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-ink/15 bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-brand-400">
              <Search size={14} className="text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name or ear tag..."
                aria-label="Search name or ear tag"
                className="w-full bg-transparent text-sm text-ink-strong outline-none placeholder:text-ink-muted"
              />
            </div>

            <button
              type="button"
              onClick={clear}
              disabled={activeCount === 0}
              className="min-h-10 rounded-md border border-ink/15 bg-card px-3 text-sm font-medium text-brand transition-colors hover:bg-brand/5 disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-card"
            >
              Clear filters
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {HISTORY_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilterChange(value)}
                aria-pressed={filter === value}
                className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  filter === value
                    ? 'border-brand bg-brand text-white'
                    : 'border-ink/15 bg-card text-ink-600 hover:border-brand/30 hover:text-brand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
