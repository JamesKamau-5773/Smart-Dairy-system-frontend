import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockDashboardRequest } from '../mockDashboard';
import { todayLocalIso } from '../../lib/localDate';

const run = async (config, scenario = 'full') => {
  const next = mockDashboardRequest(config, scenario);
  return next.adapter ? (await next.adapter(next)).data : undefined;
};

afterEach(() => window.history.replaceState(null, '', '/'));
vi.spyOn(console, 'info').mockImplementation(() => {});

describe('mock dashboard (development only)', () => {
  it('answers today’s summary from the chosen scenario', async () => {
    expect((await run({ url: '/production/summary' })).cows_milked).toBe(18);
    expect((await run({ url: '/production/summary' }, 'empty')).cows_milked).toBe(0);
    expect((await run({ url: '/production/summary' }, 'negative')).net_margin_kes).toBe(-650);
  });

  it('lets ?mock= switch scenario', async () => {
    window.history.replaceState(null, '', '/dashboard?mock=empty');
    expect((await run({ url: '/production/summary' }, 'full')).cows_milked).toBe(0);
  });

  it('answers the trend with daily totals inside the range', async () => {
    const today = todayLocalIso();
    const data = await run({ url: '/production/group-totals', params: { levels: 'day', date_from: '2000-01-01', date_to: today } });
    expect(data.groups.length).toBeGreaterThan(100);
    expect(data.groups.at(-1).key).toBe(today);
    expect(data.groups.every((group) => group.level === 'day')).toBe(true);
  });

  it('passes every other request to the backend', () => {
    for (const config of [
      { url: '/production/summary', params: { period: 'month' } },
      { url: '/production/group-totals', params: { levels: 'year,month,week,day' } },
      { url: '/production/yield' },
    ]) {
      expect(mockDashboardRequest(config, 'full')).toBe(config);
    }
  });
});
