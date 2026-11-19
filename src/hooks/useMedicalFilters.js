import { useFilterState } from './useFilterState';

// Medical Records filters, kept in the page (the search can hold a cow's or vet's name).
export const MEDICAL_FILTER_DEFAULTS = Object.freeze({ query: '', status: 'All', severity: 'All' });
export const MEDICAL_STATUSES = Object.freeze(['All', 'Under Treatment', 'Follow-up Due', 'Closed']);
export const MEDICAL_SEVERITIES = Object.freeze(['All', 'High', 'Medium', 'Low']);

/** Medical Records' search, treatment status and severity. */
export function useMedicalFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(MEDICAL_FILTER_DEFAULTS);
  return {
    values,
    activeCount,
    reset,
    setQuery: (value) => setValue('query', value),
    setStatus: (value) => setValue('status', value),
    setSeverity: (value) => setValue('severity', value),
  };
}
