// UX audit phase 4: today's dashboard figures are the backend's. When the backend can't be
// reached they show "—"; they are not worked out from the milk rows on the phone.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandCenter from '../CommandCenter';
import { todayLocalIso } from '../../lib/localDate';

const api = vi.hoisted(() => ({
  production: { summary: vi.fn(), listYield: vi.fn(), yieldTotals: vi.fn(), getGroupTotals: vi.fn() },
}));

vi.mock('../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    productionApi: { ...actual.productionApi, ...api.production },
    herdApi: { ...actual.herdApi, list: vi.fn().mockResolvedValue([]) },
    financeApi: { ...actual.financeApi, listCustomers: vi.fn().mockResolvedValue([]) },
    safetyApi: { ...actual.safetyApi, dashboard: vi.fn().mockResolvedValue({}) },
  };
});
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../components/dashboard/MilkTrendChart', () => ({ default: () => null }));

const renderDashboard = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><CommandCenter /></MemoryRouter>
  </QueryClientProvider>,
);

const cardValue = (title) => screen.getByText(title).closest('div.glass-panel').textContent;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Milk rows for today are on the phone; the old fallback would have summed these (12.5 L, 1 cow).
  api.production.listYield.mockResolvedValue([{ id: 1, cow_id: 57, amount: 12.5, milking_date: todayLocalIso() }]);
  api.production.yieldTotals.mockResolvedValue({ totalRecords: 1, totalLitres: 12.5 });
  api.production.getGroupTotals.mockResolvedValue({ groups: [] });
});
afterEach(cleanup);

describe('Dashboard: today’s figures', () => {
  it('shows the backend’s figures', async () => {
    api.production.summary.mockResolvedValue({ production_total_liters: 84.5, cows_milked: 7, avg_per_cow: 12.1, profit_per_liter: 18 });
    renderDashboard();

    await waitFor(() => expect(cardValue('Total Milk (Today)')).toContain('84.5'));
    expect(cardValue('Cows Milked')).toContain('7');
    expect(cardValue('Avg. per Cow')).toContain('12.1');
  });

  it('shows "—" when the summary can’t be loaded, instead of summing rows on the phone', async () => {
    api.production.summary.mockRejectedValue(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));
    renderDashboard();

    await waitFor(() => expect(cardValue('Total Milk (Today)')).toContain('—'));
    expect(cardValue('Total Milk (Today)')).not.toContain('12.5');
    expect(cardValue('Cows Milked')).toContain('—');
    expect(cardValue('Avg. per Cow')).toContain('—');
  });

  it('draws the chart from the backend’s daily totals, without downloading every milk record', async () => {
    api.production.summary.mockResolvedValue({ production_total_liters: 1 });
    renderDashboard();

    await waitFor(() => expect(api.production.getGroupTotals).toHaveBeenCalledWith(
      expect.objectContaining({ levels: 'day', date_from: expect.any(String), date_to: todayLocalIso() }),
    ));
    expect(api.production.listYield).not.toHaveBeenCalled();
  });
});
