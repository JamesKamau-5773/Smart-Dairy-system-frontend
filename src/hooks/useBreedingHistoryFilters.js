import { useFilterState } from './useFilterState';

// Historical Checks filters: record status and a name or ear-tag search, kept in the page.
export const BREEDING_HISTORY_FILTER_DEFAULTS = Object.freeze({ status: 'All', search: '' });

/** The breeding history's status and search. */
export function useBreedingHistoryFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(BREEDING_HISTORY_FILTER_DEFAULTS);
  return {
    values,
    activeCount,
    reset,
    setStatus: (value) => setValue('status', value),
    setSearch: (value) => setValue('search', value),
  };
}
