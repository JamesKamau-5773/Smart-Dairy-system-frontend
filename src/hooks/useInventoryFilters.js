import { useFilterState } from './useFilterState';

// Inventory filters. Search and category live in the address, so Feeding → Ingredients can
// open the list pre-filtered and Back, reloads and shared links keep them. "Show archived"
// stays in the page, as before.
export const INVENTORY_FILTER_DEFAULTS = Object.freeze({ q: '', category: 'All', archived: 'no' });
const URL_KEYS = Object.freeze(['q', 'category']);

/** The stock list's search, category and archived toggle. */
export function useInventoryFilters() {
  const { values, setValue, activeCount, reset } = useFilterState(INVENTORY_FILTER_DEFAULTS, { urlKeys: URL_KEYS });
  return {
    values,
    activeCount,
    reset,
    showArchived: values.archived === 'yes',
    setSearch: (value) => setValue('q', value),
    setCategory: (value) => setValue('category', value),
    setShowArchived: (on) => setValue('archived', on ? 'yes' : 'no'),
  };
}
