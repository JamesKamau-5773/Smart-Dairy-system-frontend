import { useFilterState } from './useFilterState';

// Staff filters. "Show former staff" lives in the address; the search stays in the page (it
// holds people's names).
export const STAFF_FILTER_DEFAULTS = Object.freeze({ search: '', former: 'no' });
const URL_KEYS = Object.freeze(['former']);
const ALLOWED = Object.freeze({ former: Object.freeze(['no', 'yes']) });

/** The staff list's search and "Show former staff". */
export function useStaffFilters() {
  const { values, setValue, setValues, activeCount, reset } = useFilterState(STAFF_FILTER_DEFAULTS, { urlKeys: URL_KEYS, allowed: ALLOWED });
  return {
    values,
    activeCount,
    reset,
    showFormer: values.former === 'yes',
    setSearch: (value) => setValue('search', value),
    setShowFormer: (on) => setValue('former', on ? 'yes' : 'no'),
    // "No matches" offers to show everyone: no search, former staff included.
    showEveryone: () => setValues({ search: '', former: 'yes' }),
  };
}
