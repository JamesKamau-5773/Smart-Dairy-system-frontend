import { useFilterState } from './useFilterState';

// Cow Register filters, kept in the address (Back, reload and shared links keep them).
// The sort order sits with them but isn't a filter: it isn't counted or reset.
export const HERD_FILTER_DEFAULTS = Object.freeze({ q: '', status: 'All', sort: 'age' });
export const HERD_STATUSES = Object.freeze(['All', 'Milking', 'Dry']);
export const HERD_SORTS = Object.freeze(['age', 'breed', 'status']);
const URL_KEYS = Object.freeze(['q', 'status', 'sort']);
const ALLOWED = Object.freeze({ status: HERD_STATUSES, sort: Object.freeze([...HERD_SORTS, 'name']) });
const UNCOUNTED = Object.freeze(['sort']);

/** The Cow Register's search, status and sort. */
export function useHerdFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(HERD_FILTER_DEFAULTS, { urlKeys: URL_KEYS, allowed: ALLOWED, uncounted: UNCOUNTED });
  return {
    values,
    activeCount,
    reset,
    setSearch: (value) => setValue('q', value),
    setStatus: (value) => setValue('status', value),
    setSort: (value) => setValue('sort', value),
  };
}
