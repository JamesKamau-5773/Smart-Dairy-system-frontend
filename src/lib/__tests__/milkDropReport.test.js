import { describe, expect, it } from 'vitest';
import { formatAlertDate, normalizeMilkDropReport } from '../milkDropReport';

describe('normalizeMilkDropReport', () => {
  it('keeps unknown figures unknown instead of guessing', () => {
    const report = normalizeMilkDropReport({ id: 1 });
    expect(report.missing_milk).toBeNull();
    expect(report.date_time).toBeNull();
    expect(report.cow_tag).toBeNull();
  });

  it('reads the litres from any of the backend’s field names, including 0', () => {
    expect(normalizeMilkDropReport({ delta_liters: '4.5' }).missing_milk).toBe(4.5);
    expect(normalizeMilkDropReport({ missing_milk: 0 }).missing_milk).toBe(0);
  });
});

describe('formatAlertDate', () => {
  it('shows "—" for a missing or unreadable date', () => {
    expect(formatAlertDate(null)).toBe('—');
    expect(formatAlertDate('not a date')).toBe('—');
    expect(formatAlertDate('2026-11-07T06:00:00Z')).not.toBe('—');
  });
});
