import { useFilterState } from './useFilterState';
import { ISO_DATE_FILTER } from './useUrlFilters';

// A cow's milk history filters. Day, status and session live in the address; the search stays
// in the page: it matches the milker, which can be a phone number, and those never go in a URL.
export const MILK_HISTORY_FILTER_DEFAULTS = Object.freeze({ search: '', date: '', status: 'all', session: 'all' });
export const MILK_HISTORY_STATUSES = Object.freeze(['all', 'verified', 'pending', 'flagged']);
export const MILK_HISTORY_SESSIONS = Object.freeze(['all', 'morning', 'afternoon', 'evening']);
const URL_KEYS = Object.freeze(['date', 'status', 'session']);
const ALLOWED = Object.freeze({ date: ISO_DATE_FILTER, status: MILK_HISTORY_STATUSES, session: MILK_HISTORY_SESSIONS });

/** The milk history's search, day, status and session. */
export function useMilkHistoryFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(MILK_HISTORY_FILTER_DEFAULTS, { urlKeys: URL_KEYS, allowed: ALLOWED });
  return {
    values,
    activeCount,
    reset,
    setSearch: (value) => setValue('search', value),
    setDate: (value) => setValue('date', value),
    setStatus: (value) => setValue('status', value),
    setSession: (value) => setValue('session', value),
  };
}
