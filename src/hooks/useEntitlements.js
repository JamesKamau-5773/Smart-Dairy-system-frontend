import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { featureAccess, limitFor, normalizeEntitlements } from '../lib/entitlements';

/**
 * The signed-in farm's plan, limits and demo status from the backend session. Returns safe
 * "unknown" values when the backend hasn't sent them; it never assumes a plan.
 *
 * @returns {import('../lib/entitlements').Entitlements & {
 *   access: (featureKey: string) => 'enabled'|'locked'|'unknown',
 *   limit: (key: string) => number|null,
 * }}
 *
 * @example
 * const { isDemo, access } = useEntitlements();
 * if (access('payroll') === 'locked') { … }
 */
export function useEntitlements() {
  const { currentUser } = useAuth();
  const raw = currentUser?.entitlements;
  return useMemo(() => {
    const entitlements = normalizeEntitlements(raw);
    return {
      ...entitlements,
      access: (featureKey) => featureAccess(entitlements, featureKey),
      limit: (key) => limitFor(entitlements, key),
    };
  }, [raw]);
}
