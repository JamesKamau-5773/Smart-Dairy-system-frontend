import { toLocalIsoDate, todayLocalIso } from './localDate';

// Milk withdrawal ("hardlock") records as the backend sends them
// (`GET /veterinary/hardlocks/active`). The backend is the source of truth:
// fields it doesn't send stay null here and show as "Not recorded".

// Backend severity is `high` | `medium` | `low` (from the withdrawal period).
// Older payloads used CRITICAL / WARNING; map those onto the same scale.
const SEVERITY_ALIASES = { critical: 'high', warning: 'medium', cleared: 'low' };
export const SEVERITIES = Object.freeze(['high', 'medium', 'low']);

export function normalizeSeverity(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const severity = SEVERITY_ALIASES[raw] ?? raw;
  return SEVERITIES.includes(severity) ? severity : null;
}

const orNull = (value) => (value === undefined || value === '' ? null : value);

export function normalizeHardlock(lock = {}) {
  const cowId = lock.cow_id ?? lock.cowId ?? lock.animal_id ?? lock.animalId ?? null;
  return {
    id: lock.id ?? lock.hardlock_id ?? lock.lock_id ?? cowId,
    cowId,
    cowName: orNull(lock.cow_name ?? lock.cowName ?? lock.animal_name ?? lock.animalName),
    cowTag: orNull(lock.cow_tag ?? lock.cowTag ?? lock.tag_number ?? lock.tagNumber),
    reason: orNull(lock.reason),
    severity: normalizeSeverity(lock.severity ?? lock.status),
    lockExpires: orNull(lock.lock_expires ?? lock.lockExpires ?? lock.expires_at ?? lock.expiresAt),
    medication: orNull(lock.medication ?? lock.treatment),
    updatedAt: orNull(lock.updated_at ?? lock.updatedAt),
    notes: orNull(lock.notes),
    // Backend fields (STAFF_PAYROLL_SAFETY_LEDGER_API §4). `canRelease` false while the
    // withdrawal runs or the latest test failed; releasing then needs an audited reason.
    withdrawalEndsAt: orNull(lock.withdrawal_ends_at),
    holdUntil: orNull(lock.hold_until),
    withdrawalActive: lock.withdrawal_active === true,
    canRelease: lock.can_release !== false,
    source: orNull(lock.source),
    treatedAt: orNull(lock.treated_at),
    vetName: orNull(lock.vet_name),
    updatedBy: orNull(lock.updated_by),
    latestTest: lock.latest_test ?? null,
  };
}

/** `{ items, total }` from the paginated response (or a bare list from older backends). */
export function readHardlockPage(payload) {
  const items = Array.isArray(payload) ? payload : (payload?.items ?? payload?.data ?? []);
  const total = Number(payload?.meta?.total);
  return { items: items.map(normalizeHardlock), total: Number.isFinite(total) ? total : items.length };
}

/**
 * Days until the milk may be sold again, from the backend's `lock_expires`.
 * 0 means the withdrawal period has passed (the lock can be released); null
 * means the backend gave no date.
 */
export function daysUntilClear(lockExpires, now = new Date()) {
  const expiry = toLocalIsoDate(lockExpires);
  if (!expiry) return null;
  // Whole calendar days, as farmers count a withdrawal period.
  const days = Math.round((Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${todayLocalIso(now)}T00:00:00Z`)) / 86_400_000);
  return Math.max(0, days);
}

export function formatLockExpiry(value) {
  if (!value) return null;
  const parsed = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Counts by severity, for the summary row. */
export function countBySeverity(locks) {
  return SEVERITIES.reduce((counts, severity) => ({ ...counts, [severity]: locks.filter((lock) => lock.severity === severity).length }), {});
}

/** Query key for one cow's milk tests. */
export const milkTestsKey = (tenantId, cowId) => ['milk-tests', tenantId, cowId];
