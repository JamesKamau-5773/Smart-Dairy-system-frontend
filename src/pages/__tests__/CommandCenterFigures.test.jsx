// UX audit phase 4: today's dashboard figures are the backend's. When the backend can't be
// reached they show "—"; they are not worked out from the milk rows on the phone.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    await waitFor(() => expect(cardValue('Total milk (today)')).toContain('84.5'));
    expect(cardValue('Cows milked')).toContain('7');
    expect(cardValue('Avg. per cow')).toContain('12.1');
  });

  it('shows "—" when the summary can’t be loaded, instead of summing rows on the phone', async () => {
    api.production.summary.mockRejectedValue(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));
    renderDashboard();

    await waitFor(() => expect(cardValue('Total milk (today)')).toContain('—'));
    expect(cardValue('Total milk (today)')).not.toContain('12.5');
    expect(cardValue('Cows milked')).toContain('—');
    expect(cardValue('Avg. per cow')).toContain('—');
  });

  it('draws the chart from the backend’s daily totals, without downloading every milk record', async () => {
    api.production.summary.mockResolvedValue({ production_total_liters: 1 });
    renderDashboard();

    await waitFor(() => expect(api.production.getGroupTotals).toHaveBeenCalledWith(
      expect.objectContaining({ levels: 'day', date_from: expect.any(String), date_to: todayLocalIso() }),
    ));
    expect(api.production.listYield).not.toHaveBeenCalled();
  });

  it('leads the money with Daily profit and ends the milk grid with Milk remaining', async () => {
    api.production.summary.mockResolvedValue({ production_total_liters: 84.5, cows_milked: 7, net_margin_kes: 3400 });
    renderDashboard();

    const money = await screen.findByRole('region', { name: 'Today’s money' });
    await waitFor(() => expect(money.textContent).toContain('KES 3,400'));
    const moneyLabels = [...money.querySelectorAll('.text-stat-label')].map((node) => node.textContent);
    expect(moneyLabels).toEqual(['Daily profit', 'Transaction revenue', 'Today’s feed cost']);

    const milk = screen.getByRole('region', { name: 'Today’s milk' });
    const milkLabels = [...milk.querySelectorAll('.text-stat-label')].map((node) => node.textContent);
    expect(milkLabels[0]).toBe('Total milk (today)');
    expect(milkLabels.at(-1)).toBe('Milk remaining');
    expect(milkLabels).toHaveLength(7);
  });

  it('keeps every card in place and adds a slim "Record milk" notice before today’s first milking', async () => {
    api.production.summary.mockResolvedValue({ cows_milked: 0, production_total_liters: 0, net_margin_kes: 0, revenue_total_kes: 0, feed_cost_total_kes: 0 });
    renderDashboard();

    expect(await screen.findByText('No milking recorded yet today.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Record milk' }).getAttribute('href')).toBe('/operations/clerk');
    // All ten cards stay, with the backend's zeros as sent.
    const milk = screen.getByRole('region', { name: 'Today’s milk' });
    expect(milk.querySelectorAll('.text-stat-label')).toHaveLength(7);
    expect(cardValue('Total milk (today)')).toContain('0.0');
    expect(cardValue('Daily profit')).toContain('KES 0');
  });

  it('hides the notice for the rest of the session once dismissed', async () => {
    sessionStorage.clear();
    api.production.summary.mockResolvedValue({ cows_milked: 0 });
    const first = renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss this notice' }));
    expect(screen.queryByText('No milking recorded yet today.')).toBeNull();
    first.unmount();

    renderDashboard();
    await waitFor(() => expect(cardValue('Cows milked')).toContain('0'));
    expect(screen.queryByText('No milking recorded yet today.')).toBeNull();
    sessionStorage.clear();
  });

  it('shows skeletons, not dashes, while the summary loads', async () => {
    api.production.summary.mockReturnValue(new Promise(() => {}));
    renderDashboard();

    const money = await screen.findByRole('region', { name: 'Today’s money' });
    expect(money.querySelectorAll('[aria-busy="true"]')).toHaveLength(3);
    expect(money.textContent).not.toContain('—');
    expect(screen.getByRole('region', { name: 'Today’s milk' }).querySelectorAll('[aria-busy="true"]')).toHaveLength(7);
  });

  it('does not show the notice when the summary failed', async () => {
    api.production.summary.mockRejectedValue(Object.assign(new Error('HTTP 503'), { response: { status: 503, data: {} } }));
    renderDashboard();

    await waitFor(() => expect(cardValue('Total milk (today)')).toContain('—'));
    expect(screen.queryByText('No milking recorded yet today.')).toBeNull();
  });
});
