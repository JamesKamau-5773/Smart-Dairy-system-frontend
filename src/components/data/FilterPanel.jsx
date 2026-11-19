import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SURFACE } from './surface';
import { commonCopy } from '../../i18n/common';

/**
 * The one search-and-filter container for list pages: a collapsible header ("Search and filter
 * …", a chevron, "N filters active" while collapsed), a "Reset filters" link while any filter
 * is set, the page's controls, and an optional results line under them.
 *
 * Presentational and page-agnostic: the page's filter hook (built on useFilterState) supplies
 * `activeCount` and `onReset`, and the page passes its controls as children.
 *
 * title:          "Search and filter transactions"
 * activeCount:    filters that differ from their defaults
 * onReset:        puts every filter back to its default
 * defaultOpen:    false (collapsed) unless a page has a reason to open it
 * resultsSummary: e.g. "Showing 169 ledger records" plus an InfoTip
 */
export default function FilterPanel({ title, activeCount = 0, onReset, defaultOpen = false, resultsSummary, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const hasActive = activeCount > 0;

  return (
    <section aria-label={title} className={`${SURFACE} px-3 sm:px-4`}>
      <div className="flex min-h-12 min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="-ml-1 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-input px-1 text-left text-body-strong text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-ink-muted transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0">{title}</span>
          {!open && hasActive && (
            <span className="shrink-0 text-meta text-ink-muted">· {commonCopy.filters.active(activeCount)}</span>
          )}
        </button>
        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 shrink-0 items-center rounded-input px-1 text-control text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-8"
          >
            {commonCopy.filters.resetFilters}
          </button>
        )}
      </div>
      <div id={bodyId} hidden={!open} className="space-y-2 border-t border-ink/10 pb-3 pt-3">
        {children}
        {resultsSummary && <div className="text-meta text-ink-muted">{resultsSummary}</div>}
      </div>
    </section>
  );
}
