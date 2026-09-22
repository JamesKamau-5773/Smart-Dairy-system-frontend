import { describe, expect, it } from 'vitest';
import {
  buildCalfMilkFeedPayload,
  filterMilkDispositions,
  isActiveCalf,
  normalizeMilkDisposition,
  summarizeConsumptionByCalf,
  summarizeMilkDispositions,
  validateCalfMilkFeed,
} from '../milkDisposition';

describe('milk disposition helpers', () => {
  it('builds the calf feeding payload required by the backend', () => {
    expect(buildCalfMilkFeedPayload({
      calfId: '12',
      liters: '3.5',
      date: '2026-09-15',
      notes: ' Morning feeding ',
    })).toEqual({
      type: 'CALF_FEED',
      calf_id: 12,
      liters: 3.5,
      date: '2026-09-15',
      notes: 'Morning feeding',
    });
  });

  it('only treats active animals with Calf status as selectable', () => {
    expect(isActiveCalf({ current_status: 'Calf', is_active: true })).toBe(true);
    expect(isActiveCalf({ currentStatus: 'calf', isActive: false })).toBe(false);
    expect(isActiveCalf({ current_status: 'Heifer', is_active: true })).toBe(false);
  });

  it('normalizes the backend disposition response', () => {
    expect(normalizeMilkDisposition({
      id: 8,
      disposition_type: 'CALF_FEED',
      disposition_date: '2026-09-15',
      liters: 3.5,
      calf: { id: 12, tag_number: 'C-012', name: 'Amani' },
      recorded_by: 7,
    })).toMatchObject({
      id: 8,
      type: 'CALF_FEED',
      date: '2026-09-15',
      liters: 3.5,
      calfId: 12,
      calfTag: 'C-012',
      calfName: 'Amani',
      recordedBy: 7,
    });
  });

  it('rejects invalid client-side values before submission', () => {
    expect(validateCalfMilkFeed({ calfId: '', liters: 3.5, date: '2026-09-15' })).toBe('Select a calf.');
    expect(validateCalfMilkFeed({ calfId: 12, liters: 0, date: '2026-09-15' })).toBe('Enter a milk amount greater than zero.');
  });

  it('filters authoritative records and derives operational summaries', () => {
    const records = [
      { id: 1, calfId: 12, calfName: 'Amani', calfTag: 'C-012', liters: 3.5, date: '2026-09-15' },
      { id: 2, calfId: 12, calfName: 'Amani', calfTag: 'C-012', liters: 2.5, date: '2026-09-14' },
      { id: 3, calfId: 13, calfName: 'Baraka', calfTag: 'C-013', liters: 4, date: '2026-08-31' },
    ];

    expect(filterMilkDispositions(records, { calfId: '12', from: '2026-09-01', to: '2026-09-30' })).toHaveLength(2);
    expect(summarizeMilkDispositions(records, '2026-09-15')).toEqual({
      todayLiters: 3.5,
      monthLiters: 6,
      calfCount: 2,
      recordCount: 3,
    });
    expect(summarizeConsumptionByCalf(records)[0]).toMatchObject({ calfId: 12, liters: 6, feedings: 2 });
  });
});