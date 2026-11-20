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
 * Today's figures on the dashboard, read from the backend's GET /production/summary. Nothing is
 * worked out here: each figure is the backend's field (under any of the names it has used), or
 * null when the backend did not send it, so the card shows "—".
 *
 * `hasRecordsToday` is false only when the backend says no cows were milked today
 * (`cows_milked` is 0), and null when it did not say (unknown: the normal grid shows).
 * TODO(BR-028): read the backend's `records_today` instead of `cows_milked` once it is sent.
 */
export function readDailySummary(summary) {
  const metric = (keys) => metricFromSummary(summary, keys);
  const cowsMilked = metric(['cows_milked', 'cowsMilked', 'today_cows_milked', 'todayCowsMilked', 'milked_cows', 'milkedCows']);

  return {
    profit: metric(['net_margin_kes']),
    revenue: metric(['revenue_total_kes']),
    feedCost: metric(['feed_cost_total_kes']),
    reportRevenue: metricFromSummary(summary?.revenue_breakdown, ['report_sales_revenue_kes']),
    totalLiters: metric([
      'production_total_liters', 'total_liters_today', 'totalLitersToday', 'today_total_liters',
      'todayTotalLiters', 'total_liters', 'totalLiters', 'total_volume', 'totalVolume',
    ]),
    saleableLiters: metric(['saleable_liters']),
    soldLiters: metric(['total_sold_liters']),
    // Shown as sent, negative included (in the danger tone). TODO(BR-028): it can come back
    // below zero (more sold or used than recorded); the backend calculation needs checking.
    remainingLiters: metric(['remaining_milk_liters']),
    cowsMilked,
    averagePerCow: metric(['average_yield_per_cow', 'averageYieldPerCow', 'avg_per_cow', 'avgPerCow', 'average_per_cow']),
    profitPerLiter: metric(['profit_per_liter', 'profitPerLiter']),
    currency: typeof summary?.currency === 'string' && summary.currency ? summary.currency : null,
    hasRecordsToday: cowsMilked === null ? null : cowsMilked > 0,
  };
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
