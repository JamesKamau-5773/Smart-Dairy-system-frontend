import { afterEach, describe, expect, it } from 'vitest';
import { groupByDaySession, normalizeYieldRow, statusEmphasis, vsAverage } from '../milkRecords';
import { formatFarmTime, setFarmTimeZone } from '../localDate';

describe('normalizeYieldRow (API → milk record)', () => {
  const api = {
    id: 812,
    cow_id: 7,
    cow_tag: '002',
    cow_name: 'Joyce',
    amount: 6.0,
    session: 'Morning',
    status: 'RECORDED',
    milker_name: 'Wanjiru',
    recorded_by_name: 'Kamau',
    recorded_via: 'app',
    avg_litres: '6.9',
    vs_avg_litres: '-0.9',
    significant_drop: false,
    timestamp: '2026-11-18T03:12:00+00:00',
    bucket: { year: '2026', month: '2026-11', week: '2026-W47', day: '2026-11-18' },
  };

  it('maps each field the phone list shows from its API field', () => {
    expect(normalizeYieldRow(api)).toMatchObject({
      id: 812,
      day: '2026-11-18',
      timestamp: '2026-11-18T03:12:00+00:00',
      cowName: 'Joyce',
      cowId: '002',
      amount: 6.0,
      session: 'Morning',
      status: 'Pending',
      milker: 'Wanjiru',
      recordedBy: 'Kamau',
      avgLitres: '6.9',
      vsAvgLitres: '-0.9',
      significantDrop: false,
      recordedByIsMilker: null,
      recordedAt: null,
    });
  });

  it('reads the backend’s statuses, and never assumes one', () => {
    expect(normalizeYieldRow({ ...api, status: 'VERIFIED' }).status).toBe('Verified');
    expect(normalizeYieldRow({ ...api, status: 'FLAGGED' }).status).toBe('Flagged');
    expect(normalizeYieldRow({ ...api, status: 'ISOLATED' }).status).toBe('Isolated');
    expect(normalizeYieldRow({ ...api, status: null }).status).toBeNull();
  });

  it('takes "same as milker" and the entry time only from the backend (BR-029)', () => {
    expect(normalizeYieldRow({ ...api, recorded_by_is_milker: true }).recordedByIsMilker).toBe(true);
    expect(normalizeYieldRow({ ...api, recorded_by_is_milker: false }).recordedByIsMilker).toBe(false);
    expect(normalizeYieldRow({ ...api, recorded_by_is_milker: 'yes' }).recordedByIsMilker).toBeNull();
    expect(normalizeYieldRow({ ...api, recorded_at: '2026-11-18T03:20:00+00:00' }).recordedAt).toBe('2026-11-18T03:20:00+00:00');
  });
});

describe('groupByDaySession', () => {
  const record = (id, day, session) => ({ id, day, session });

  it('groups by farm day and session in the order the backend sent (newest first), sorting nothing', () => {
    const groups = groupByDaySession([
      record(1, '2026-11-18', 'Morning'),
      record(2, '2026-11-18', 'Morning'),
      record(3, '2026-11-17', 'Evening'),
      record(4, '2026-11-17', 'Morning'),
      record(5, '2026-11-17', 'Morning'),
    ]);
    expect(groups.map((group) => [group.day, group.session, group.records.map((r) => r.id)])).toEqual([
      ['2026-11-18', 'Morning', [1, 2]],
      ['2026-11-17', 'Evening', [3]],
      ['2026-11-17', 'Morning', [4, 5]],
    ]);
  });

  it('keeps keys unique when a day and session come back again later in the list', () => {
    const groups = groupByDaySession([record(1, '2026-11-18', 'Morning'), record(2, '2026-11-17', 'Evening'), record(3, '2026-11-18', 'Morning')]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(3);
  });

  it('falls back to the record’s date when it has no bucket day', () => {
    expect(groupByDaySession([{ id: 1, day: null, date: '2026-11-01', session: 'Evening' }])[0].day).toBe('2026-11-01');
  });
});

describe('vsAverage', () => {
  it('turns the backend’s signed litres into a direction and a size', () => {
    expect(vsAverage('-0.9')).toEqual({ direction: 'down', litres: '0.9 L' });
    expect(vsAverage(0.3)).toEqual({ direction: 'up', litres: '0.3 L' });
    expect(vsAverage('2')).toEqual({ direction: 'up', litres: '2.0 L' });
    expect(vsAverage('−1.4')).toEqual({ direction: 'down', litres: '1.4 L' });
  });

  it('says "level" for zero and null when the backend sent nothing', () => {
    expect(vsAverage('0.0')).toEqual({ direction: 'level', litres: '0.0 L' });
    expect(vsAverage(null)).toBeNull();
    expect(vsAverage('')).toBeNull();
    expect(vsAverage('n/a')).toBeNull();
  });
});

describe('statusEmphasis', () => {
  it('marks only exceptions: Pending outlined, Flagged and Isolated solid', () => {
    expect(statusEmphasis('Verified')).toBeNull();
    expect(statusEmphasis('Pending')).toBe('outline');
    expect(statusEmphasis('Flagged')).toBe('solid');
    expect(statusEmphasis('Isolated')).toBe('solid');
    expect(statusEmphasis(null)).toBeNull();
  });
});

describe('formatFarmTime', () => {
  afterEach(() => setFarmTimeZone('UTC'));

  it('shows the clock time in the farm’s timezone from the backend', () => {
    setFarmTimeZone('Africa/Nairobi');
    expect(formatFarmTime('2026-11-18T03:12:00Z')).toBe('06:12');
    setFarmTimeZone('Africa/Lagos');
    expect(formatFarmTime('2026-11-18T03:12:00Z')).toBe('04:12');
  });

  it('is null for a missing or unreadable time', () => {
    expect(formatFarmTime(null)).toBeNull();
    expect(formatFarmTime('not a date')).toBeNull();
  });
});
