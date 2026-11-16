import { useCallback } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ledgerApi, productionApi } from '../lib/backendApi';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { useTenant } from './useTenant';
import { useOnlineStatus } from './useOnlineStatus';
import { getListLoadState } from '../lib/listLoadState';
import {
  summaryScopeParams,
  toLedgerGroupTotals,
  toLedgerSummary,
  toProductionGroupTotals,
  toProductionSummary,
  toTotalsParams,
} from '../lib/periodTotals';

// Transport for the period totals contract (docs/contracts/period-totals.md). Pages don't
// call these directly: each domain's data hook (useLedgerData, useProductionData) builds one
// set of params and hands it to the rows, the group totals and the summary together.

// One shape for every totals hook: the view model plus what a panel needs to
// pick a loading, error, offline or ready state.
function useTotalsQuery({ queryKey, queryFn, select, enabled }) {
  const online = useOnlineStatus();
  const query = useQuery({ queryKey, queryFn, select, enabled, placeholderData: keepPreviousData });
  const loadState = getListLoadState({ status: query.status, fetchStatus: query.fetchStatus, data: query.data });
  return {
    data: query.data ?? null,
    loadState,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    // Cached figures shown while offline or after a failed refresh carry their time.
    asOf: (!online || loadState === 'stale') && query.data ? query.dataUpdatedAt : null,
  };
}

function useScope() {
  const { tenantId, farmId } = useTenant();
  return { tenantId, farmId, enabled: Boolean(tenantId && farmId) };
}

const summaryParams = (range, filters) => ({ ...summaryScopeParams(range), ...toTotalsParams(filters) });
const levelParams = (filters, levels) => ({ ...toTotalsParams(filters), ...(levels ? { levels: levels.join(',') } : {}) });

/** Ledger summary for the table's date range and other filters. */
export function useLedgerSummary({ range, filters }) {
  const { tenantId, farmId, enabled } = useScope();
  const params = summaryParams(range, filters);
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.LEDGER_SUMMARY(tenantId, farmId), params],
    queryFn: () => ledgerApi.getSummary(params),
    select: toLedgerSummary,
    enabled,
  });
}

export function useLedgerGroupTotals(filters, { levels, enabled: allowed = true } = {}) {
  const { tenantId, farmId, enabled } = useScope();
  const params = levelParams(filters, levels);
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.LEDGER_GROUP_TOTALS(tenantId, farmId), params],
    queryFn: () => ledgerApi.getGroupTotals(params),
    select: toLedgerGroupTotals,
    enabled: enabled && allowed,
  });
}

/** Production summary for the table's date range and other filters. */
export function useProductionSummary({ range, filters }) {
  const { tenantId, farmId, enabled } = useScope();
  const params = summaryParams(range, filters);
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.PRODUCTION_PERIOD_SUMMARY(tenantId, farmId), params],
    queryFn: () => productionApi.getPeriodSummary(params),
    select: toProductionSummary,
    enabled,
  });
}

export function useProductionGroupTotals(filters, { levels } = {}) {
  const { tenantId, farmId, enabled } = useScope();
  const params = levelParams(filters, levels);
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.PRODUCTION_GROUP_TOTALS(tenantId, farmId), params],
    queryFn: () => productionApi.getGroupTotals(params),
    select: toProductionGroupTotals,
    enabled,
  });
}

/** After a write, refresh the rows and every total that depends on them. */
export function useInvalidateLedger() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  return useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEDGER_ENTRIES(tenantId, farmId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEDGER_SUMMARY(tenantId, farmId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEDGER_GROUP_TOTALS(tenantId, farmId) }),
  ]), [queryClient, tenantId, farmId]);
}

export function useInvalidateProduction() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  return useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_ROWS(tenantId, farmId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTION_PERIOD_SUMMARY(tenantId, farmId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTION_GROUP_TOTALS(tenantId, farmId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId) }),
  ]), [queryClient, tenantId, farmId]);
}
