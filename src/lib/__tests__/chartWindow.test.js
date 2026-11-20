import { describe, expect, it } from 'vitest';
import { bucketRange, chartWindow } from '../chartWindow';

describe('chartWindow', () => {
  it('shows a bar per day for ranges up to 31 days', () => {
    const span = chartWindow('2026-10-17', '2026-11-16');
    expect(span).toMatchObject({ from: '2026-10-17', to: '2026-11-16', granularity: 'day', trailing: false });
    expect(span.keys).toHaveLength(31);
    expect(span.keys[0]).toBe('2026-10-17');
    expect(span.keys.at(-1)).toBe('2026-11-16');
  });

  it('shows a bar per month for longer ranges', () => {
    const span = chartWindow('2026-10-16', '2026-11-16');
    expect(span.granularity).toBe('month');
    expect(span.keys).toEqual(['2026-10', '2026-11']);
  });

  it('shows the trailing 30 days for a single day', () => {
    const span = chartWindow('2026-11-16', '2026-11-16');
    expect(span).toMatchObject({ from: '2026-10-18', to: '2026-11-16', granularity: 'day', trailing: true });
    expect(span.keys).toHaveLength(30);
  });

  it('refuses a missing or reversed range', () => {
    expect(chartWindow('', '2026-11-16')).toBeNull();
    expect(chartWindow('2026-11-17', '2026-11-16')).toBeNull();
  });

  it('gives each bar its dates, keeping partial months inside the range', () => {
    const months = chartWindow('2026-09-15', '2026-11-16');
    expect(bucketRange(months, '2026-09')).toEqual({ from: '2026-09-15', to: '2026-09-30' });
    expect(bucketRange(months, '2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(bucketRange(months, '2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-16' });
    expect(bucketRange(chartWindow('2026-11-01', '2026-11-16'), '2026-11-06')).toEqual({ from: '2026-11-06', to: '2026-11-06' });
  });
});
