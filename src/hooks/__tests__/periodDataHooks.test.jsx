import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLedgerData } from '../useLedgerData';
import { useProductionData } from '../useProductionData';
import { useMoneyFlowSeries } from '../useMoneyFlowSeries';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({
  listLedgerEntries: vi.fn(),
  ledgerSummary: vi.fn(),
  ledgerGroupTotals: vi.fn(),
  listYield: vi.fn(),
  productionSummary: vi.fn(),
  productionGroupTotals: vi.fn(),
}));

vi.mock('../useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }) }));
vi.mock('../../lib/backendApi', () => ({
  financeApi: { listLedgerEntries: api.listLedgerEntries },
  ledgerApi: { getSummary: api.ledgerSummary, getGroupTotals: api.ledgerGroupTotals },
  productionApi: { listYield: api.listYield, getPeriodSummary: api.productionSummary, getGroupTotals: api.productionGroupTotals },
}));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  api.listLedgerEntries.mockResolvedValue({ items: [{ id: 1 }], meta: { total: 563 } });
  api.ledgerSummary.mockResolvedValue({ label: 'Nov 2026', current: { income: '1740000', expenses: '0', net: '1740000', unpaid: '0', count: 3 } });
  api.ledgerGroupTotals.mockResolvedValue({ groups: [{ level: 'day', key: '2026-11-06', count: 2, income: '100', expenses: '50', net: '50' }] });
  api.listYield.mockResolvedValue([{ id: 'y1' }]);
  api.productionSummary.mockResolvedValue({ label: 'Nov 2026', current: { litres: '246.0', entries: 36 } });
  api.productionGroupTotals.mockResolvedValue({ groups: [] });
});

describe('useLedgerData', () => {
  it('requests rows, group totals and the strip with the same filters and range', async () => {
    const { result } = renderHook(() => useLedgerData({
      filters: { type: 'revenue', category: 'all', search: 'Auntie' },
      range: { from: '2026-10-01', to: '2026-10-15' },
    }), { wrapper });

    await waitFor(() => expect(result.current.rows.loadState).toBe('ready'));
    const shared = { type: 'revenue', search: 'Auntie', date_from: '2026-10-01', date_to: '2026-10-15' };
    expect(api.listLedgerEntries).toHaveBeenCalledWith({ per_page: 100, farm_id: 'farm-1', tenant_id: 'tenant-1', ...shared, search_query: 'Auntie' });
    expect(api.ledgerGroupTotals).toHaveBeenCalledWith({ ...shared, levels: 'year,month,day' });
    expect(api.ledgerSummary).toHaveBeenCalledWith({ ...shared, period: 'custom' });
    expect(result.current.rows.total).toBe(563);
    await waitFor(() => expect(result.current.summary.data.current.income).toBe(17400));
  });

  it('drops "all" filters and sends only the range when nothing else is chosen', async () => {
    const range = { from: '2026-11-01', to: '2026-11-16' };
    renderHook(() => useLedgerData({ filters: { type: 'all', category: 'all', search: '' }, range }), { wrapper });
    await waitFor(() => expect(api.listLedgerEntries).toHaveBeenCalled());
    const dates = { date_from: '2026-11-01', date_to: '2026-11-16' };
    expect(api.listLedgerEntries).toHaveBeenCalledWith({ per_page: 100, farm_id: 'farm-1', tenant_id: 'tenant-1', ...dates });
    expect(api.ledgerGroupTotals).toHaveBeenCalledWith({ ...dates, levels: 'year,month,day' });
    expect(api.ledgerSummary).toHaveBeenCalledWith({ ...dates, period: 'custom' });
  });
});

describe('useProductionData', () => {
  it('requests rows, group totals and the strip with the same filters and day', async () => {
    const { result } = renderHook(() => useProductionData({
      filters: { search: 'Neema', session: 'Morning' },
      range: { from: '2026-11-07', to: '2026-11-07' },
    }), { wrapper });

    await waitFor(() => expect(result.current.rows.loadState).toBe('ready'));
    const shared = { search: 'Neema', session: 'Morning', date_from: '2026-11-07', date_to: '2026-11-07' };
    expect(api.listYield).toHaveBeenCalledWith(shared);
    expect(api.productionGroupTotals).toHaveBeenCalledWith({ ...shared, levels: 'year,month,day' });
    expect(api.productionSummary).toHaveBeenCalledWith({ ...shared, period: 'custom' });
    expect(result.current.rows.data).toEqual([{ id: 'y1' }]);
  });

  it('drops the "all" session and sends only the range', async () => {
    renderHook(() => useProductionData({ filters: { search: '', session: 'all' }, range: { from: '2026-11-01', to: '2026-11-16' } }), { wrapper });
    await waitFor(() => expect(api.listYield).toHaveBeenCalled());
    expect(api.listYield).toHaveBeenCalledWith({ date_from: '2026-11-01', date_to: '2026-11-16' });
    expect(api.productionSummary).toHaveBeenCalledWith({ period: 'custom', date_from: '2026-11-01', date_to: '2026-11-16' });
  });
});

describe('useMoneyFlowSeries', () => {
  it('asks for day totals over the range and leaves days the API did not return empty', async () => {
    const { result } = renderHook(() => useMoneyFlowSeries({ start: '2026-11-05', end: '2026-11-07', search: '' }), { wrapper });
    await waitFor(() => expect(result.current.loadState).toBe('ready'));
    expect(api.ledgerGroupTotals).toHaveBeenCalledWith({ date_from: '2026-11-05', date_to: '2026-11-07', levels: 'day' });
    expect(result.current.items.map((item) => [item.key, item.totals?.income ?? null])).toEqual([
      ['2026-11-05', null], ['2026-11-06', 1], ['2026-11-07', null],
    ]);
  });

  it('asks for month totals over a long range, with the search', async () => {
    renderHook(() => useMoneyFlowSeries({ start: '2026-09-15', end: '2026-11-16', search: 'milk' }), { wrapper });
    await waitFor(() => expect(api.ledgerGroupTotals).toHaveBeenCalled());
    expect(api.ledgerGroupTotals).toHaveBeenCalledWith({ date_from: '2026-09-15', date_to: '2026-11-16', search: 'milk', levels: 'month' });
  });

  it('requests nothing while disabled', () => {
    renderHook(() => useMoneyFlowSeries({ start: '2026-11-01', end: '2026-11-16', enabled: false }), { wrapper });
    expect(api.ledgerGroupTotals).not.toHaveBeenCalled();
  });
});
