// The farm's plan and limits, as the backend reports them on the session
// (`entitlements`, BACKEND_REQUESTS.md BR-014). Nothing here assumes a plan: when the backend
// hasn't sent something, it is unknown, nothing is locked, and the backend still enforces access.
// Demo status is not here: it is top-level on the session (see hooks/useDemoSession.js).

const toNumberOrNull = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));

/**
 * @typedef {object} Entitlements
 * @property {boolean} known  True when the backend sent entitlements at all.
 * @property {{ id: string, name: string }|null} plan
 * @property {Set<string>|null} features  Feature keys in the plan; null = unknown.
 * @property {Record<string, number|null>} limits
 * @property {Record<string, number|null>} usage
 * @property {string|null} upgradeUrl
 */

/** @returns {Entitlements} */
export function normalizeEntitlements(raw) {
  if (!raw || typeof raw !== 'object') {
    return { known: false, plan: null, features: null, limits: {}, usage: {}, upgradeUrl: null };
  }
  const plan = raw.plan && typeof raw.plan === 'object'
    ? { id: String(raw.plan.id ?? ''), name: String(raw.plan.name ?? raw.plan.id ?? '') }
    : null;
  const mapNumbers = (source) => Object.fromEntries(
    Object.entries(source && typeof source === 'object' ? source : {}).map(([key, value]) => [key, toNumberOrNull(value)]),
  );
  return {
    known: true,
    plan,
    features: Array.isArray(raw.features) ? new Set(raw.features.map(String)) : null,
    limits: mapNumbers(raw.limits),
    usage: mapNumbers(raw.usage),
    upgradeUrl: typeof raw.upgrade_url === 'string' && /^https:\/\//.test(raw.upgrade_url) ? raw.upgrade_url : null,
  };
}

/**
 * 'enabled' | 'locked' | 'unknown'. Only 'locked' when the backend listed the plan's features
 * and this one isn't among them.
 */
export function featureAccess(entitlements, featureKey) {
  if (!entitlements?.features) return 'unknown';
  return entitlements.features.has(featureKey) ? 'enabled' : 'locked';
}

/** A limit from the backend (e.g. 'cows', 'receipt_upload_max_bytes'), or null when unknown. */
export function limitFor(entitlements, key) {
  return entitlements?.limits?.[key] ?? null;
}
