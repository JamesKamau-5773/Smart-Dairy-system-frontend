import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { financeApi } from '../lib/backendApi';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { getListLoadState } from '../lib/listLoadState';
import { TABLE_GROUP_LEVELS, toTotalsParams } from '../lib/periodTotals';
import { useTenant } from './useTenant';
import { useLedgerGroupTotals, useLedgerSummary } from './usePeriodTotals';

/**
 * Everything the Ledger shows, from one set of filters: the rows, the group totals and the
 * summary strip. All three are requested with the same params, so the strip and the group
 * headers always describe exactly the rows below them. No figure is worked out here.
 *
 * filters: { type, category, search }  ('all' and '' mean no filter)
 * range:   { from, to } as YYYY-MM-DD (the page's default is the current month)
 */
export function useLedgerData({ filters, range }) {
  const { tenantId, farmId } = useTenant();
  const tableParams = toTotalsParams({ ...filters, date_from: range.from, date_to: range.to });

  const rowsQuery = useQuery({
    queryKey: [...QUERY_KEYS.LEDGER_ENTRIES(tenantId, farmId), tableParams],
    // The ledger endpoint needs the scope as query parameters for the farm-wide view.
    queryFn: () => financeApi.listLedgerEntries({
      per_page: 100,
      farm_id: farmId,
      tenant_id: tenantId,
      ...tableParams,
      // The list historically read `search_query`; the contract names it `search`.
      ...(tableParams.search ? { search_query: tableParams.search } : {}),
    }),
    enabled: Boolean(tenantId && farmId),
    placeholderData: keepPreviousData,
  });

  const groupTotals = useLedgerGroupTotals(tableParams, { levels: TABLE_GROUP_LEVELS });
  const summary = useLedgerSummary({ range, filters });

  return {
    rows: {
      items: rowsQuery.data?.items ?? [],
      // The count the API reports for these filters; null when it didn't say.
      total: rowsQuery.data?.meta?.total ?? null,
      // Search notes from the API (e.g. a misspelt name matched to a customer).
      searchScope: rowsQuery.data?.summary_scope ?? null,
      loadState: getListLoadState({ status: rowsQuery.status, fetchStatus: rowsQuery.fetchStatus, data: rowsQuery.data }),
      error: rowsQuery.error,
      refetch: rowsQuery.refetch,
    },
    groupTotals,
    summary,
  };
}
