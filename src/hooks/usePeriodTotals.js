import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ledgerApi, productionApi } from '../lib/backendApi';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { useTenant } from './useTenant';
import { useOnlineStatus } from './useOnlineStatus';
import { getListLoadState } from '../lib/listLoadState';
import { todayLocalIso } from '../lib/localDate';
import {
  CUSTOM_PERIOD,
  PERIODS,
  neighbourAnchor,
  toLedgerGroupTotals,
  toLedgerSummary,
  toProductionGroupTotals,
  toProductionSummary,
  toTotalsParams,
} from '../lib/periodTotals';

const storageKey = (pageKey) => `jivu:period:${pageKey}`;

function readStoredPeriod(pageKey, fallback) {
  try {
    const stored = window.localStorage.getItem(storageKey(pageKey));
    return PERIODS.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The selected period (remembered per page), the anchor date being viewed and, for a
 * custom period, the farmer's own range ({ from, to } as YYYY-MM-DD).
 */
export function usePeriodSelection(pageKey, fallback = 'month') {
  const [period, setPeriodState] = useState(() => readStoredPeriod(pageKey, fallback));
  const [anchor, setAnchor] = useState(() => todayLocalIso());
  const [customRange, setCustomRangeState] = useState(null);

  // A custom range is for this visit only; the calendar period stays remembered.
  const setCustomRange = useCallback((range) => {
    if (!range?.from || !range?.to) return;
    setCustomRangeState({ from: range.from, to: range.to });
    setPeriodState(CUSTOM_PERIOD);
  }, []);

  const setPeriod = useCallback((next) => {
    if (!PERIODS.includes(next)) return;
    setPeriodState(next);
    setCustomRangeState(null);
    setAnchor(todayLocalIso());
    try {
      window.localStorage.setItem(storageKey(pageKey), next);
    } catch {
      // Storage blocked (private mode): the choice lasts for this visit only.
    }
  }, [pageKey]);

  // Steps from the range the API returned; null when that range isn't known yet.
  const step = useCallback((range, direction) => {
    const next = neighbourAnchor(range, direction);
    if (next) setAnchor(next);
  }, []);

  return { period, anchor, customRange, setPeriod, setCustomRange, step };
}

/** Summary params: a calendar period and its anchor, or a custom range. */
export function periodParams({ period, anchor, customRange }) {
  return period === CUSTOM_PERIOD && customRange
    ? { period: CUSTOM_PERIOD, date_from: customRange.from, date_to: customRange.to }
    : { period, anchor };
}

// One shape for every totals hook: the view model plus what the panel needs to
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

export function useLedgerSummary({ period, anchor, customRange, filters }) {
  const { tenantId, farmId, enabled } = useScope();
  const params = { ...periodParams({ period, anchor, customRange }), ...toTotalsParams(filters) };
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.LEDGER_SUMMARY(tenantId, farmId), params],
    queryFn: () => ledgerApi.getSummary(params),
    select: toLedgerSummary,
    enabled,
  });
}

export function useLedgerGroupTotals(filters, { levels, enabled: allowed = true } = {}) {
  const { tenantId, farmId, enabled } = useScope();
  const params = { ...toTotalsParams(filters), ...(levels ? { levels: levels.join(',') } : {}) };
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.LEDGER_GROUP_TOTALS(tenantId, farmId), params],
    queryFn: () => ledgerApi.getGroupTotals(params),
    select: toLedgerGroupTotals,
    enabled: enabled && allowed,
  });
}

export function useProductionSummary({ period, anchor, filters }) {
  const { tenantId, farmId, enabled } = useScope();
  const params = { period, anchor, ...toTotalsParams(filters) };
  return useTotalsQuery({
    queryKey: [...QUERY_KEYS.PRODUCTION_PERIOD_SUMMARY(tenantId, farmId), params],
    queryFn: () => productionApi.getPeriodSummary(params),
    select: toProductionSummary,
    enabled,
  });
}

export function useProductionGroupTotals(filters) {
  const { tenantId, farmId, enabled } = useScope();
  const params = toTotalsParams(filters);
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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.YIELD_TREND(tenantId, farmId) }),
  ]), [queryClient, tenantId, farmId]);
}
