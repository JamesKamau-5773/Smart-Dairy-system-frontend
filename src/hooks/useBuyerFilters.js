import { useFilterState } from './useFilterState';

// Buyers List filters. The balance status lives in the address; the search stays in the page
// (names and phone numbers never go in a URL).
export const BUYER_FILTER_DEFAULTS = Object.freeze({ search: '', status: 'all' });
export const BUYER_STATUSES = Object.freeze(['all', 'outstanding', 'settled']);
const URL_KEYS = Object.freeze(['status']);
const ALLOWED = Object.freeze({ status: BUYER_STATUSES });

/** The buyers list's search and balance status. */
export function useBuyerFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(BUYER_FILTER_DEFAULTS, { urlKeys: URL_KEYS, allowed: ALLOWED });
  return {
    values,
    activeCount,
    reset,
    setSearch: (value) => setValue('search', value),
    setStatus: (value) => setValue('status', value),
  };
}
