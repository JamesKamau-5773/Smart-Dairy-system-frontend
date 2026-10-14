import { endOfDay, isValid, parseISO, startOfDay, startOfMonth, subDays, subMonths, subWeeks } from 'date-fns';

export const REPORT_PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
];

export function parseDateOnly(value, fallback) {
  if (!value) return fallback;
  const date = parseISO(value);
  return isValid(date) ? startOfDay(date) : fallback;
}

export function getRangeForPeriod(period, startDateValue, endDateValue) {
  const today = startOfDay(new Date());

  switch (period) {
    case 'daily':
      return { startDate: today, endDate: endOfDay(today) };
    case 'weekly':
      return { startDate: startOfDay(subDays(today, 6)), endDate: endOfDay(today) };
    case 'monthly':
      return { startDate: startOfMonth(subMonths(today, 1)), endDate: endOfDay(today) };
    case 'custom':
      return {
        startDate: parseDateOnly(startDateValue, startOfDay(subWeeks(today, 1))),
        endDate: parseDateOnly(endDateValue, endOfDay(today)),
      };
    default:
      return { startDate: today, endDate: endOfDay(today) };
  }
}

export function isValidRange(startDate, endDate) {
  return isValid(startDate) && isValid(endDate) && startDate <= endDate;
}
