import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from './useTenant';
import { QUERY_KEYS } from '../providers/QueryProvider';
import { herdApi } from '../lib/backendApi';

/**
 * Loads the data daily offline work depends on while there is a connection, so it is in the
 * phone's 7-day query cache before the farmer walks into a shed with no signal. The milk form
 * needs the cow list to record milk offline.
 */
export function usePrefetchOfflineEssentials() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();

  useEffect(() => {
    if (!farmId || !navigator.onLine) return;
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.COWS(tenantId, farmId),
      queryFn: () => herdApi.list(),
    });
  }, [queryClient, tenantId, farmId]);
}
