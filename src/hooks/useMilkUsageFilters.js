import { useFilterState } from './useFilterState';

// Milk Usage filters and their defaults: every calf, every date. Kept in the page (not the
// address), as before.
export const MILK_USAGE_FILTER_DEFAULTS = Object.freeze({ calfId: '', from: '', to: '' });
// From and To are one filter: the date range.
const LINKED = Object.freeze([Object.freeze(['from', 'to'])]);

/** The Milk Usage filters, for the filter panel and the feeding list alike. */
export function useMilkUsageFilters() {
  const { values, setValue, setValues, activeCount, reset } = useFilterState(MILK_USAGE_FILTER_DEFAULTS, { linked: LINKED });
  return {
    values,
    activeCount,
    reset,
    setCalf: (value) => setValue('calfId', value),
    setRange: (range) => setValues({ from: range?.from ?? '', to: range?.to ?? '' }),
    // null (every date) until a range is chosen.
    range: values.from && values.to ? { from: values.from, to: values.to } : null,
  };
}
