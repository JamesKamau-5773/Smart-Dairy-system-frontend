import { useFilterState } from './useFilterState';

// Customer Management's one filter: a name or phone search, kept in the page (never in a URL).
export const CUSTOMER_FILTER_DEFAULTS = Object.freeze({ search: '' });

/** The customer list's search. */
export function useCustomerFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(CUSTOMER_FILTER_DEFAULTS);
  return { values, activeCount, reset, setSearch: (value) => setValue('search', value) };
}
