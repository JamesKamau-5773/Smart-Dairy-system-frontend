import { useFilterState } from './useFilterState';

// Milk safety hold filters, kept in the page: a cow search and the risk level.
export const SAFETY_FILTER_DEFAULTS = Object.freeze({ query: '', severity: 'all' });

/** The safety board's search and risk level. */
export function useSafetyFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(SAFETY_FILTER_DEFAULTS);
  return {
    values,
    activeCount,
    reset,
    setQuery: (value) => setValue('query', value),
    setSeverity: (value) => setValue('severity', value),
  };
}
