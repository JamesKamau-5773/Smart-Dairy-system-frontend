import { useFilterState } from './useFilterState';
import { ISO_DATE_FILTER } from './useUrlFilters';
import { currentYearRange } from '../lib/periodTotals';

// Every Production Log filter and its default, all kept in the address (Back, reload and
// shared links keep them). The search is a cow's name or tag, which is safe in a URL.
// No status filter: the backend ignores status (except "anomaly") on this list, so it would
// look like it filtered while showing everything (BACKEND_REQUESTS.md, BR-019).
// `date` is the older one-day filter, still read so saved links keep working.
export const PRODUCTION_FILTER_DEFAULTS = Object.freeze({ cowId: '', session: 'all', from: '', to: '', date: '' });
export const PRODUCTION_SESSIONS = Object.freeze(['all', 'Morning', 'Midday', 'Evening']);
const URL_KEYS = Object.freeze(['cowId', 'session', 'from', 'to', 'date']);
const ALLOWED = Object.freeze({ session: PRODUCTION_SESSIONS, from: ISO_DATE_FILTER, to: ISO_DATE_FILTER, date: ISO_DATE_FILTER });
// From, To and the older one-day `date` are one filter: the dates.
const LINKED = Object.freeze([Object.freeze(['from', 'to', 'date'])]);

/** The range chosen in the address (ISO dates compare as text), or null for the default year. */
const chosenRangeOf = ({ from, to, date }) => {
  if (from && to && from <= to) return { from, to };
  return date ? { from: date, to: date } : null;
};

/**
 * The Production Log's filters, for the filter panel and the data hook alike.
 * `today` (YYYY-MM-DD) sets the default range: 1 January to today.
 */
export function useProductionFilters({ today }) {
  const { values, setValue, setValues, activeCount, reset } = useFilterState(PRODUCTION_FILTER_DEFAULTS, {
    urlKeys: URL_KEYS,
    allowed: ALLOWED,
    linked: LINKED,
  });
  const chosenRange = chosenRangeOf(values);

  return {
    values,
    activeCount,
    reset,
    setSearch: (value) => setValue('cowId', value),
    setSession: (value) => setValue('session', value),
    // A chosen range replaces an older one-day link.
    setRange: (range) => setValues({ from: range?.from ?? '', to: range?.to ?? '', date: '' }),
    range: chosenRange ?? currentYearRange(today),
    // The one day chosen, if the range is a single day (the calf-feeding form opens on it).
    chosenDay: chosenRange && chosenRange.from === chosenRange.to ? chosenRange.from : '',
    query: { search: values.cowId.trim(), session: values.session },
  };
}
