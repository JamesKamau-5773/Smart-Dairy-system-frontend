import { useFilterState } from './useFilterState';
import { useDebouncedValue } from './useDebouncedValue';
import { ISO_DATE_FILTER } from './useUrlFilters';

// Farm Reporting Dashboard filters, all in the address as before: the search (q), the chosen
// buyers (buyer_id, comma-separated), and the period with its dates. Other pages link here
// with ?period=custom&start_date=…&end_date=… (the Ledger's "View full report").
export const REPORT_FILTER_DEFAULTS = Object.freeze({ q: '', buyer_id: '', period: 'daily', start_date: '', end_date: '' });
const URL_KEYS = Object.freeze(Object.keys(REPORT_FILTER_DEFAULTS));
const ALLOWED = Object.freeze({ start_date: ISO_DATE_FILTER, end_date: ISO_DATE_FILTER });
// The period and its dates are one filter: the dates.
const LINKED = Object.freeze([Object.freeze(['period', 'start_date', 'end_date'])]);
const SEARCH_DELAY_MS = 500;

/** The dashboard's search, buyers and dates. */
export function useReportFilters() {
  const { values, setValue, setValues, activeCount, reset } = useFilterState(REPORT_FILTER_DEFAULTS, {
    urlKeys: URL_KEYS,
    allowed: ALLOWED,
    linked: LINKED,
  });
  const buyerIds = values.buyer_id ? values.buyer_id.split(',').map((value) => value.trim()).filter(Boolean) : [];

  return {
    values,
    activeCount,
    reset,
    buyerIds,
    // The report is asked for once typing pauses.
    search: useDebouncedValue(values.q, SEARCH_DELAY_MS),
    setSearch: (value) => setValue('q', value),
    setBuyerIds: (ids) => setValue('buyer_id', ids.filter(Boolean).join(',')),
    setDates: ({ period, from, to }) => setValues({ period, start_date: from ?? '', end_date: to ?? '' }),
  };
}
