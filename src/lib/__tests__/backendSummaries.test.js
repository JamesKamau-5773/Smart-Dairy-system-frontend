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
  it('reads the all-time milk totals from the yield list summary', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [], summary: { total_records: 12, total_volume: 1306.4 } } });
    expect(await productionApi.yieldTotals()).toEqual({ totalRecords: 12, totalLitres: 1306.4 });
  });

  it('keeps missing totals unknown', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [] } });
    expect(await productionApi.yieldTotals()).toEqual({ totalRecords: null, totalLitres: null });
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
