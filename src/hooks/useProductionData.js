import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productionApi } from '../lib/backendApi';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { getListLoadState } from '../lib/listLoadState';
import { TABLE_GROUP_LEVELS, toTotalsParams } from '../lib/periodTotals';
import { useTenant } from './useTenant';
import { useProductionGroupTotals, useProductionSummary } from './usePeriodTotals';

/**
 * Everything the Production Log shows, from one set of filters: the milk rows, the group
 * totals, the summary and the status counts, all requested with the same params so they agree.
 * Rows come back as the API sent them; the page maps them for display.
 *
 * filters: { search, session }  ('all' and '' mean no filter)
 * range:   { from, to } as YYYY-MM-DD (the page's default is the current month)
 */
export function useProductionData({ filters, range }) {
  const { tenantId, farmId } = useTenant();
  const tableParams = toTotalsParams({ ...filters, date_from: range.from, date_to: range.to });

  const rowsQuery = useQuery({
    queryKey: [...QUERY_KEYS.YIELD_ROWS(tenantId, farmId), tableParams],
    queryFn: () => productionApi.listYield(tableParams),
    placeholderData: keepPreviousData,
  });

  // Record and status counts from the yield list's `summary` (verified, pending, flagged…).
  // Under the rows' key, so saving a record refetches them too.
  const totalsQuery = useQuery({
    queryKey: [...QUERY_KEYS.YIELD_ROWS(tenantId, farmId), 'totals', tableParams],
    queryFn: () => productionApi.yieldTotals(tableParams),
    placeholderData: keepPreviousData,
  });

  const groupTotals = useProductionGroupTotals(tableParams, { levels: TABLE_GROUP_LEVELS });
  const summary = useProductionSummary({ range, filters });

  return {
    rows: {
      data: rowsQuery.data,
      loadState: getListLoadState({ status: rowsQuery.status, fetchStatus: rowsQuery.fetchStatus, data: rowsQuery.data }),
      error: rowsQuery.error,
      isError: rowsQuery.isError,
      refetch: rowsQuery.refetch,
    },
    totals: {
      data: totalsQuery.data ?? null,
      loadState: getListLoadState({ status: totalsQuery.status, fetchStatus: totalsQuery.fetchStatus, data: totalsQuery.data }),
      refetch: totalsQuery.refetch,
    },
    groupTotals,
    summary,
  };
}
