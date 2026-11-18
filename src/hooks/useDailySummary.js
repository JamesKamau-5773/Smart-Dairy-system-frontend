import { useQuery } from '@tanstack/react-query';
import { useTenant } from './useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { productionApi } from '../lib/backendApi';
import { readDailySummary } from '../lib/dashboardUtils';

const UNKNOWN = readDailySummary(null);

/**
 * Today's dashboard figures (GET /production/summary). The page reads `figures` and the load
 * state; it does not know where they come from.
 *
 * - `figures`: the backend's values (see readDailySummary), all null until it answers or when
 *   it can't be reached.
 * - `hasRecordsToday`: false only once the backend has answered that no cows were milked today;
 *   null while loading, after an error, or when the backend did not say.
 */
export function useDailySummary() {
  const { tenantId, farmId } = useTenant();
  const query = useQuery({
    queryKey: QUERY_KEYS.YIELD_SUMMARY(tenantId, farmId),
    queryFn: () => productionApi.summary(),
    enabled: !!farmId,
  });

  const figures = query.isSuccess ? readDailySummary(query.data) : UNKNOWN;

  return {
    figures,
    hasRecordsToday: query.isSuccess ? figures.hasRecordsToday : null,
    // Pending covers the wait for the farm too (the query is disabled until it is known), so the
    // cards show skeletons, never dashes, until the backend has answered.
    isLoading: query.isPending,
    isError: query.isError,
    isRetrying: query.isFetching,
    retry: () => query.refetch(),
  };
}
