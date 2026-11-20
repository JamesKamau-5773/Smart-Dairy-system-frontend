import { chartWindow } from '../lib/chartWindow';
import { useLedgerGroupTotals } from './usePeriodTotals';

/**
 * Money in and out per day or per month for a date range, from the ledger group-totals
 * endpoint (`levels=day` or `levels=month`), with the same date range and search as the
 * dashboard's figures. One item per bucket on the axis; a bucket the API didn't return has
 * `totals: null` and is drawn empty. Nothing is added up here.
 *
 * TODO(BR-023): group totals can't be narrowed to customers yet, so the dashboard doesn't
 * request the chart while a customer filter is on (`enabled: false`).
 */
export function useMoneyFlowSeries({ start, end, search, enabled = true }) {
  const span = chartWindow(start, end);
  const groupTotals = useLedgerGroupTotals(
    { date_from: span?.from, date_to: span?.to, search },
    { levels: span ? [span.granularity] : undefined, enabled: enabled && Boolean(span) },
  );
  const items = span
    ? span.keys.map((key) => ({ key, totals: groupTotals.data?.get(key)?.totals ?? null }))
    : [];

  return {
    span,
    items,
    loadState: groupTotals.loadState,
    error: groupTotals.error,
    refetch: groupTotals.refetch,
  };
}
