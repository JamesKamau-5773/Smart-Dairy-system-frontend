// First-run guidance for a new farm: the welcome checklist, milk milestones and
// the dashboard greeting. State is per farm and per device (localStorage).

export const MILK_MILESTONES_LITRES = [100, 1000, 10000, 100000];

const storageKey = (kind, tenantId, farmId) => `maziwa_${kind}:${tenantId}:${farmId}`;
export const checklistKey = (tenantId, farmId) => storageKey('welcome', tenantId, farmId);
export const milestoneKey = (tenantId, farmId) => storageKey('milestone', tenantId, farmId);

export function readFlag(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeFlag(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage blocked: the checklist may show again next visit.
  }
}

/**
 * What the welcome checklist should do.
 * stored: null (never shown) | 'active' (shown with steps left) | 'done' | 'dismissed'.
 * Farms that already had everything set up are marked done without ever seeing it;
 * only a farm that worked through the list gets the celebration.
 */
export function checklistView(stored, allDone) {
  if (stored === 'done' || stored === 'dismissed') return 'hidden';
  if (allDone) return stored === 'active' ? 'celebrate' : 'mark-done';
  return 'checklist';
}

/**
 * Highest milestone reached, and whether it is new since the last one acknowledged.
 * The first time a farm is seen, its current milestone is acknowledged silently so
 * existing farms are not congratulated for old records.
 */
export function milestoneStatus(acknowledged, totalLitres) {
  const reached = MILK_MILESTONES_LITRES.filter((litres) => totalLitres >= litres).at(-1) ?? 0;
  if (acknowledged == null) return { reached, celebrate: false, acknowledgeSilently: true };
  return { reached, celebrate: reached > Number(acknowledged), acknowledgeSilently: false };
}

export function swahiliGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Habari ya asubuhi';
  if (hour < 16) return 'Habari ya mchana';
  return 'Habari ya jioni';
}
