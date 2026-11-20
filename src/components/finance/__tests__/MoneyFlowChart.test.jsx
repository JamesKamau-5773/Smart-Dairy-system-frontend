import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MoneyFlowChart from '../MoneyFlowChart';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({ getGroupTotals: vi.fn() }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }) }));
vi.mock('../../../lib/backendApi', () => ({
  ledgerApi: { getGroupTotals: api.getGroupTotals },
  getApiErrorMessage: (error, fallback) => error?.message ?? fallback,
}));

function LedgerProbe() {
  const location = useLocation();
  return <p>Ledger at {location.search}</p>;
}

const renderChart = (props) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/operations/reports']}>
      <Routes>
        <Route path="/operations/reports" element={<MoneyFlowChart {...props} />} />
        <Route path="/finance/ledger" element={<LedgerProbe />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  api.getGroupTotals.mockResolvedValue({ groups: [
    { level: 'month', key: '2026-10', label: 'October', count: 4, income: '480000', expenses: '120000', net: '360000' },
    { level: 'month', key: '2026-11', label: 'November', count: 2, income: '0', expenses: '7093925', net: '-7093925' },
  ] });
});

describe('MoneyFlowChart', () => {
  it('draws a bar per month for a long range from the API figures, with a legend and a text table', async () => {
    renderChart({ start: '2026-09-15', end: '2026-11-16', search: '' });

    const bar = await screen.findByRole('button', { name: /^Oct 2026 · In KES 4,800.00 · Out KES 1,200.00/ });
    expect(bar).toBeTruthy();
    expect(api.getGroupTotals).toHaveBeenCalledWith({ date_from: '2026-09-15', date_to: '2026-11-16', levels: 'month' });
    // September has no API totals: drawn empty, never as zero.
    expect(screen.getByRole('listitem', { name: 'Sep 2026: no records' })).toBeTruthy();
    expect(screen.getByText('15 Sep 2026 – 16 Nov 2026, by month')).toBeTruthy();
    expect(screen.getAllByText('Money in').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Sep 2026', 'Oct 2026', 'Nov 2026']);
  });

  it('opens the Ledger on the dates of the bar that was clicked', async () => {
    renderChart({ start: '2026-09-15', end: '2026-11-16', search: '' });
    fireEvent.click(await screen.findByRole('button', { name: /^Nov 2026 ·/ }));
    expect(screen.getByText('Ledger at ?from=2026-11-01&to=2026-11-16')).toBeTruthy();
  });

  it('shows the trailing 30 days, by day, for a single day', async () => {
    api.getGroupTotals.mockResolvedValue({ groups: [] });
    renderChart({ start: '2026-11-16', end: '2026-11-16', search: '' });
    expect(await screen.findByText('Last 30 days to 16 Nov 2026, by day')).toBeTruthy();
    expect(api.getGroupTotals).toHaveBeenCalledWith({ date_from: '2026-10-18', date_to: '2026-11-16', levels: 'day' });
  });

  it('says it cannot filter by customer yet instead of showing unfiltered figures', () => {
    renderChart({ start: '2026-11-01', end: '2026-11-16', search: '', customerSelected: true });
    expect(screen.getByText(/can’t be narrowed to customers yet/)).toBeTruthy();
    expect(api.getGroupTotals).not.toHaveBeenCalled();
  });
});
