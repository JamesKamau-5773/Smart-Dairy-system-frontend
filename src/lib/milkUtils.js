/**
 * @file Utility functions for processing and normalizing milk history data.
 */

/**
 * Normalizes a session string to a consistent format.
 * @param {string} value - The raw session string.
 * @returns {string} The normalized session label.
 */
export function toNormalizedSessionLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) return 'Unknown';
  if (normalized === 'midday') return 'Afternoon';
  if (normalized === 'morning') return 'Morning';
  if (normalized === 'afternoon') return 'Afternoon';
  if (normalized === 'evening') return 'Evening';

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Tries to determine the milking session (Morning, Afternoon, Evening) from a timestamp.
 * @param {object} entry - The milk log entry.
 * @returns {string|null} The derived session name or null.
 */
export function deriveMilkSessionFromLoggedAt(entry = {}) {
  const rawTimestamp = entry.created_at
    ?? entry.createdAt
    ?? entry.logged_at
    ?? entry.loggedAt
    ?? entry.recorded_at
    ?? entry.recordedAt
    ?? entry.timestamp
    ?? entry.milkingDate
    ?? null;

  if (!rawTimestamp) return null;

  const rawString = String(rawTimestamp);
  const hasTime = /T\d{1,2}:\d{2}|\s\d{1,2}:\d{2}/.test(rawString);
  if (!hasTime) return null;

  const timeMatch = rawString.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const totalMinutes = (hours * 60) + minutes;
      if (totalMinutes < 12 * 60) return 'Morning';
      if (totalMinutes <= 16 * 60) return 'Afternoon';
      return 'Evening';
    }
  }

  const parsedTime = new Date(rawTimestamp);
  if (Number.isNaN(parsedTime.getTime())) return null;

  const totalMinutes = (parsedTime.getHours() * 60) + parsedTime.getMinutes();

  if (totalMinutes < 12 * 60) return 'Morning';
  if (totalMinutes <= 16 * 60) return 'Afternoon';
  return 'Evening';
}

/**
 * Normalizes a raw milk history entry into a consistent shape for the UI.
 * @param {object} entry - The raw milk log entry from the API.
 * @returns {object} A normalized session object.
 */
export function normalizeMilkHistorySession(entry = {}) {
  const rawLiters = entry.liters ?? entry.amount ?? entry.volume ?? entry.milk_volume ?? entry.milkVolume ?? entry.yield_amount ?? entry.yieldAmount ?? 0;
  const parsedLiters = Number.parseFloat(rawLiters);
  // The explicitly recorded session (set at logging time) is ground truth — only fall back to
  // guessing from the save timestamp for legacy records that never captured a session value.
  const recordedSession = entry.session ?? entry.milking_session ?? entry.shift ?? null;
  const session = recordedSession != null
    ? toNormalizedSessionLabel(recordedSession)
    : (deriveMilkSessionFromLoggedAt(entry) ?? 'Unknown');

  return {
    date: entry.date ?? entry.milkingDate ?? entry.created_at ?? entry.createdAt ?? '',
    session,
    milker: entry.milker ?? entry.created_by ?? entry.createdBy ?? 'SYSTEM',
    liters: Number.isFinite(parsedLiters) ? parsedLiters.toFixed(1) : '0.0',
    status: entry.status ?? 'Pending',
  };
}

/**
 * Filters a list of milk sessions based on search and filter criteria.
 * @param {Array} sessions - The array of normalized milk sessions.
 * @param {object} filters - The filter values from the UI.
 * @returns {Array} The filtered array of sessions.
 */
export function filterMilkHistorySessions(sessions, filters) {
  if (!sessions || !Array.isArray(sessions)) return [];
  const searchValue = filters.search.trim().toLowerCase();
  return sessions.filter((entry) => {
    const matchesSearch = searchValue ? [entry.date, entry.session, entry.milker, entry.status, entry.liters].join(' ').toLowerCase().includes(searchValue) : true;
    const matchesDate = filters.date ? entry.date === filters.date : true;
    const matchesStatus = filters.status === 'all' ? true : entry.status.toLowerCase() === filters.status.toLowerCase();
    const matchesSession = filters.session === 'all' ? true : entry.session.toLowerCase() === filters.session.toLowerCase();
    return matchesSearch && matchesDate && matchesStatus && matchesSession;
  });
}