import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routineApi } from '../lib/backendApi';
import { useTenant } from './useTenant';

/** Cache key of the farm's daily routine (shared by the planner and the herdsman view). */
export const routinePlansKey = (tenantId, farmId) => ['routine-plans', tenantId, farmId];

/**
 * The farm's daily routine as the backend has it: normalized time blocks
 * (`normalizeRoutinePlan`). Use with `getListLoadState` for loading, offline and error.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult<Array<object>>}
 *
 * @example
 * const plansQuery = useRoutinePlans();
 * const state = getListLoadState(plansQuery);
 */
export function useRoutinePlans() {
  const { tenantId, farmId } = useTenant();
  return useQuery({
    queryKey: routinePlansKey(tenantId, farmId),
    queryFn: () => routineApi.listPlans(),
    enabled: !!tenantId && !!farmId,
  });
}

/**
 * Saves the whole routine (the backend replaces it), then refetches it so the page shows
 * what the backend stored. Saving needs a connection (offlinePolicy): a queued replace could
 * overwrite a newer plan saved from another phone.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult} `mutate(plans)` with normalized plans.
 */
export function useSaveRoutinePlans() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  return useMutation({
    mutationFn: (plans) => routineApi.savePlans(plans),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routinePlansKey(tenantId, farmId) }),
  });
}
