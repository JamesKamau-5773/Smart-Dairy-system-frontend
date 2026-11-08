import { useQuery } from '@tanstack/react-query';
import { nutritionApi } from '../lib/backendApi';
import { useTenant } from './useTenant';

/** Cache key of the farm's unit helpers (shared by the Unit Helpers page and barn-floor screens). */
export const unitConversionsKey = (tenantId, farmId) => ['unit-conversions', tenantId, farmId];

/**
 * The farm's unit helpers from the backend: `[{ id, itemId, unitName, kgEquivalent }]`.
 * Pass the data to `convertKgToLocal` (lib/units) to show feed amounts in local units.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult<Array<object>>}
 */
export function useUnitConversions() {
  const { tenantId, farmId } = useTenant();
  return useQuery({
    queryKey: unitConversionsKey(tenantId, farmId),
    queryFn: () => nutritionApi.listConversions(),
    enabled: !!tenantId && !!farmId,
  });
}
