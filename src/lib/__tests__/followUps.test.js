import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { normalizeUnitConversion, nutritionApi } from '../backendApi';
import { convertKgToLocal, convertLocalToKg, findConversionForItem } from '../units';
import { buildDailyTrend } from '../dashboardUtils';
import { QUERY_KEYS } from '../../providers/QueryProvider';

afterEach(() => vi.restoreAllMocks());

describe('unit helpers (units.js)', () => {
  const conversions = [{ id: 1, itemId: 34, unitName: 'kasuku', kgEquivalent: 2 }];

  it('finds a stock item’s helper, comparing ids as strings', () => {
    expect(findConversionForItem(conversions, '34')).toEqual(conversions[0]);
    expect(findConversionForItem(conversions, 35)).toBeNull();
    expect(findConversionForItem(null, 34)).toBeNull();
  });

  it('converts kilograms to the local unit and back', () => {
    expect(convertKgToLocal(conversions, 34, 5)).toEqual({ value: '2.5', unit: 'kasuku', wasConverted: true });
    expect(convertKgToLocal(conversions, 34, 4)).toEqual({ value: '2', unit: 'kasuku', wasConverted: true });
    expect(convertLocalToKg(conversions, 34, 3)).toBe(6);
  });

  it('leaves kilograms unchanged for an item without a helper', () => {
    expect(convertKgToLocal(conversions, 99, 5)).toEqual({ value: 5, unit: 'kg', wasConverted: false });
    expect(convertLocalToKg(conversions, 99, 5)).toBe(5);
  });
});

describe('unit helper API', () => {
  it('reads the backend’s fields', () => {
    expect(normalizeUnitConversion({ id: 1, item_id: 34, unit_name: 'kasuku', kg_equivalent: '2.5' }))
      .toEqual({ id: 1, itemId: 34, unitName: 'kasuku', kgEquivalent: 2.5 });
  });

  it('saves with the fields POST /units/conversions requires', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 2, item_id: 34, unit_name: 'kasuku', kg_equivalent: 2 } });
    const saved = await nutritionApi.saveConversion({ itemId: 34, unitName: 'kasuku', kgEquivalent: 2 });
    expect(post).toHaveBeenCalledWith('/units/conversions', { item_id: 34, unit_name: 'kasuku', kg_equivalent: 2 });
    expect(saved).toEqual({ id: 2, itemId: 34, unitName: 'kasuku', kgEquivalent: 2 });
  });
});

describe('buildDailyTrend', () => {
  const groups = {
    groups: [
      { level: 'month', key: '2026-11', litres: '60.0' },
      { level: 'day', key: '2026-11-05', litres: '20.0' },
      { level: 'day', key: '2026-11-07', litres: '40.0' },
    ],
  };

  it('lists every day of the range, with a gap (null) for days with no milk recorded', () => {
    expect(buildDailyTrend(groups, { from: '2026-11-05', to: '2026-11-08' })).toEqual([
      { date: '2026-11-05', value: 20 },
      { date: '2026-11-06', value: null },
      { date: '2026-11-07', value: 40 },
      { date: '2026-11-08', value: null },
    ]);
  });

  it('starts "all" from the first recorded day', () => {
    const points = buildDailyTrend(groups, null);
    expect(points[0]).toEqual({ date: '2026-11-05', value: 20 });
  });

  it('is empty when no day has milk, so the chart says there is no data', () => {
    expect(buildDailyTrend({ groups: [] }, { from: '2026-11-01', to: '2026-11-07' })).toEqual([]);
    expect(buildDailyTrend(undefined, { from: '2026-11-01', to: '2026-11-07' })).toEqual([]);
  });

  it('crosses month ends without time-zone drift', () => {
    const points = buildDailyTrend({ groups: [{ level: 'day', key: '2026-10-31', litres: 5 }] }, { from: '2026-10-30', to: '2026-11-01' });
    expect(points.map((point) => point.date)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});

describe('one cache key for the herd list', () => {
  it('the offline prefetch and the pages share ["herd", tenant, farm]', () => {
    expect(QUERY_KEYS.COWS('t1', 'f1')).toEqual(['herd', 't1', 'f1']);
  });
});
