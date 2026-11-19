import { useFilterState } from './useFilterState';
import { useDebouncedValue } from './useDebouncedValue';
import { ISO_DATE_FILTER } from './useUrlFilters';
import { currentYearRange } from '../lib/periodTotals';

// Every Ledger filter and its default. Type, category and the date range live in the address,
// so other pages can link to a filtered view (/finance/ledger?from=2026-11-01&to=2026-11-30).
// Search stays in the page: it can hold a customer's name or phone number.
export const LEDGER_FILTER_DEFAULTS = Object.freeze({ search: '', type: 'all', category: 'all', from: '', to: '' });
export const LEDGER_TYPES = Object.freeze(['all', 'revenue', 'expense']);
const URL_KEYS = Object.freeze(['type', 'category', 'from', 'to']);
const ALLOWED = Object.freeze({ type: LEDGER_TYPES, from: ISO_DATE_FILTER, to: ISO_DATE_FILTER });
// From and To are one filter: the date range.
const LINKED = Object.freeze([Object.freeze(['from', 'to'])]);
const SEARCH_DELAY_MS = 300;

/** The address's range when it is complete and in order (ISO dates compare as text); else null. */
const chosenRangeOf = ({ from, to }) => (from && to && from <= to ? { from, to } : null);

/**
 * The Ledger's filters, for the filter panel and the data hook alike.
 * `today` (YYYY-MM-DD) sets the default range: 1 January to today.
 */
export function useLedgerFilters({ today }) {
  const { values, setValue, setValues, activeCount, reset } = useFilterState(LEDGER_FILTER_DEFAULTS, {
    urlKeys: URL_KEYS,
    allowed: ALLOWED,
    linked: LINKED,
  });
  const search = useDebouncedValue(values.search.trim(), SEARCH_DELAY_MS);
  const chosenRange = chosenRangeOf(values);

  return {
    values,
    activeCount,
    reset,
    setSearch: (value) => setValue('search', value),
    // A category belongs to one type, so changing the type clears it.
    setType: (value) => setValues({ type: value, category: 'all' }),
    setCategory: (value) => setValue('category', value),
    setRange: (range) => setValues({ from: range?.from ?? '', to: range?.to ?? '' }),
    // The range the table and the cards cover; the current year until one is chosen.
    range: chosenRange ?? currentYearRange(today),
    isDefaultRange: !chosenRange,
    // What the API is asked for (the search once typing pauses).
    query: { type: values.type, category: values.category, search },
  };
}
