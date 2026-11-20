import { addDays, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, endOfMonth, format, parseISO } from 'date-fns';

// Which dates a money-in/out chart covers and how its bars are bucketed. Calendar only:
// this picks the request's date range and the axis; every figure comes from the API.

/** Ranges up to this many days get a bar per day; longer ranges get a bar per month. */
export const DAILY_BUCKET_MAX_DAYS = 31;
/** A single chosen day shows the trailing days ending on it. */
export const TRAILING_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const toIso = (date) => format(date, 'yyyy-MM-dd');

/**
 * start, end: YYYY-MM-DD (inclusive). Returns null for a missing or reversed range, else
 * { from, to, granularity: 'day' | 'month', trailing, keys } where `keys` are the bucket keys
 * in order, in the group-totals key format ("2026-11-06" or "2026-11").
 */
export function chartWindow(start, end) {
  if (!ISO_DATE.test(start ?? '') || !ISO_DATE.test(end ?? '') || start > end) return null;
  const trailing = start === end;
  const from = trailing ? toIso(addDays(parseISO(end), -(TRAILING_DAYS - 1))) : start;
  const interval = { start: parseISO(from), end: parseISO(end) };
  const days = differenceInCalendarDays(interval.end, interval.start) + 1;
  const granularity = days <= DAILY_BUCKET_MAX_DAYS ? 'day' : 'month';
  const keys = granularity === 'day'
    ? eachDayOfInterval(interval).map(toIso)
    : eachMonthOfInterval(interval).map((date) => format(date, 'yyyy-MM'));
  return { from, to: end, granularity, trailing, keys };
}

/** The dates one bar covers, kept inside the window (a partial first or last month). */
export function bucketRange(window, key) {
  if (window.granularity === 'day') return { from: key, to: key };
  const monthStart = `${key}-01`;
  const monthEnd = toIso(endOfMonth(parseISO(monthStart)));
  return {
    from: monthStart < window.from ? window.from : monthStart,
    to: monthEnd > window.to ? window.to : monthEnd,
  };
}
