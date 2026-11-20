import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { animalsApi, herdApi, productionApi } from '../backendApi';

afterEach(() => vi.restoreAllMocks());

describe('herdApi.summary', () => {
  it('reads the counts the backend computes for the whole herd', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { items: [], summary: { total_count: 250, milking_count: 120, dry_count: 40, average_age_months: 41.6, latest_calved: '2026-10-30' } },
    });
    expect(await herdApi.summary()).toEqual({
      totalCount: 250, milkingCount: 120, dryCount: 40, averageAgeMonths: 41.6, latestCalved: '2026-10-30',
    });
    expect(get).toHaveBeenCalledWith('/herd', { params: { per_page: 1 } });
  });

  it('keeps missing counts unknown (null), never 0', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    expect(await herdApi.summary()).toEqual({
      totalCount: null, milkingCount: null, dryCount: null, averageAgeMonths: null, latestCalved: null,
    });
  });
});

describe('productionApi.yieldTotals', () => {
  it('reads the milk totals and status counts from the yield list summary', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [], summary: {
      total_records: 12, total_volume: 1306.4, verified_count: 9, recorded_count: 1, flagged_count: 2, isolated_count: 0,
      // Older aliases are ignored: pending is the backend's RECORDED count.
      pending_count: 99,
    } } });
    expect(await productionApi.yieldTotals({ date_from: '2026-01-01' })).toEqual({
      totalRecords: 12, totalLitres: 1306.4, verified: 9, pending: 1, flagged: 2, isolated: 0,
    });
    expect(get).toHaveBeenCalledWith('/production/yield', { params: { date_from: '2026-01-01', page: 1, per_page: 1 } });
  });

  it('keeps missing totals unknown', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [] } });
    expect(await productionApi.yieldTotals()).toEqual({
      totalRecords: null, totalLitres: null, verified: null, pending: null, flagged: null, isolated: null,
    });
  });
});

describe('animalsApi.milkHistory stats', () => {
  it('passes through the backend’s average, peak, total and session count', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        sessions: [{ id: 1 }],
        meta: { pages: 1 },
        summary: { average_yield: 14.2, peak_yield: 18, total_logged: 412.5, session_count: 30 },
      },
    });
    const { stats } = await animalsApi.milkHistory(57);
    expect(stats).toEqual({ average_yield: 14.2, peak_yield: 18, total_logged: 412.5, session_count: 30 });
  });
});
