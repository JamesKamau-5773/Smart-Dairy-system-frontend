import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { useTenant } from './useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { productionApi } from '../lib/backendApi';
import { buildDailyTrend } from '../lib/dashboardUtils';
import { toLocalIsoDate } from '../lib/localDate';
import { getListLoadState } from '../lib/listLoadState';

/** The range choices, in the order the buttons show them. */
export const TREND_RANGES = ['30', '90', 'all'];

/**
 * The dashboard's milk trend: the chosen range and the backend's daily totals for it
 * (GET /production/group-totals?levels=day), not every milk record downloaded and added up.
 * "all" asks for every recorded day.
 */
export function useMilkTrend() {
  const { tenantId, farmId } = useTenant();
  const [selectedRange, setSelectedRange] = useState('30');
  const [dateRange, setDateRange] = useState(() => ({ from: subDays(new Date(), 29), to: new Date() }));

  const trendRange = selectedRange === 'all'
    ? null
    : { from: toLocalIsoDate(dateRange.from), to: toLocalIsoDate(dateRange.to) };
  const trendParams = trendRange
    ? { levels: 'day', date_from: trendRange.from, date_to: trendRange.to }
    : { levels: 'day' };

  const query = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTION_GROUP_TOTALS(tenantId, farmId), 'dashboard-trend', trendParams],
    queryFn: () => productionApi.getGroupTotals(trendParams),
    enabled: !!farmId,
  });

  const trend = useMemo(
    () => buildDailyTrend(query.data, trendRange),
    // trendRange is rebuilt every render; its two strings are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, trendRange?.from, trendRange?.to],
  );

  const selectRange = (range) => {
    setSelectedRange(range);
    if (range === 'all') return;
    const today = new Date();
    setDateRange({ from: subDays(today, Number(range) - 1), to: today });
  };

  return {
    trend,
    selectedRange,
    selectRange,
    state: getListLoadState(query),
    error: query.error,
    retry: query.refetch,
  };
}
