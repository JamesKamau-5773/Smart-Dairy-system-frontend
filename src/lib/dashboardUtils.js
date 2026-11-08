import { todayLocalIso } from './localDate';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Calendar days from `from` to `to` (inclusive), as YYYY-MM-DD; no time-zone maths.
function eachDay(from, to) {
  const days = [];
  const [y, m, d] = from.split('-').map(Number);
  for (let date = new Date(Date.UTC(y, m - 1, d)); ; date.setUTCDate(date.getUTCDate() + 1)) {
    const pad = (value) => String(value).padStart(2, '0');
    const key = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    if (key > to) break;
    days.push(key);
  }
  return days;
}

export function metricFromSummary(summary, keys) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (summary[key] !== undefined && summary[key] !== null) {
      const parsed = Number.parseFloat(summary[key]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Daily milk for the dashboard chart, from the backend's production group totals
 * (GET /production/group-totals?levels=day); nothing is added up on the phone.
 * Every day of the range is listed; a day with no milk recorded has `value: null` (a gap in
 * the line) rather than a zero the farm never recorded. Empty when no day has any milk.
 *
 * @param {{ groups?: Array<{ level: string, key: string, litres?: string|number|null }> }} groupTotals
 * @param {{ from: string, to: string }|null} range YYYY-MM-DD days; null = from the first
 *   recorded day to today.
 * @returns {Array<{ date: string, value: number|null }>}
 */
export function buildDailyTrend(groupTotals, range = null) {
  const litresByDay = new Map(
    (Array.isArray(groupTotals?.groups) ? groupTotals.groups : [])
      .filter((group) => group?.level === 'day' && ISO_DAY.test(group.key ?? ''))
      .map((group) => [group.key, group.litres === null || group.litres === undefined ? null : Number(group.litres)]),
  );
  const recordedDays = [...litresByDay.keys()].sort();
  const from = range?.from ?? recordedDays[0];
  const to = range?.to ?? todayLocalIso();
  if (!from || !to || !ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) return [];

  const points = eachDay(from, to).map((date) => ({ date, value: litresByDay.get(date) ?? null }));
  return points.some((point) => Number.isFinite(point.value)) ? points : [];
}
