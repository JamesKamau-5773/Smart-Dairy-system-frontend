import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const backendMocks = vi.hoisted(() => ({
  listLedgerEntries: vi.fn(),
  listAnimals: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { role: 'FARMER' } }),
}));

vi.mock('../../../lib/backendApi', () => ({
  financeApi: { listLedgerEntries: backendMocks.listLedgerEntries },
  herdApi: { list: backendMocks.listAnimals },
  getApiErrorMessage: (error) => error?.message || 'Request failed',
}));

import FinancialLedger from '../FinancialLedger';

const allAccountsResponse = {
  items: [],
  meta: { total: 161 },
  summary: {
    recognized_sales: 21280,
    posted_costs: 21755,
    net_profit: -475,
    outstanding_receivables: 24110,
    customer_credit: 636,
    ledger_records: 161,
  },
  summary_scope: { mode: 'all', search_query: null },
};

const auntieResponse = {
  items: [],
  meta: { total: 2 },
  summary: {
    recognized_sales: 2200,
    posted_costs: 0,
    net_profit: 2200,
    outstanding_receivables: 1600,
    customer_credit: 0,
    ledger_records: 2,
  },
  summary_scope: { mode: 'search', search_query: 'Auntie' },
};

const renderLedger = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(FinancialLedger)
  ));
};

beforeEach(() => {
  vi.clearAllMocks();
  backendMocks.listLedgerEntries.mockImplementation((params) => (
    Promise.resolve(params.search_query ? auntieResponse : allAccountsResponse)
  ));
  backendMocks.listAnimals.mockResolvedValue([
    { id: 'C-007', name: 'C-007' },
    { id: '006', name: '006' },
  ]);
});

describe('FinancialLedger summaries', () => {
  it('uses backend summary fields and scopes customer searches on the server', async () => {
    renderLedger();

    expect(await screen.findByText('Total Sales')).toBeTruthy();
    expect(screen.getByText('Posted Costs')).toBeTruthy();
    expect(screen.getByText('Net Profit')).toBeTruthy();
    expect(screen.getByText('Customer Credit')).toBeTruthy();
    expect(screen.getByText('Unpaid Money')).toBeTruthy();
    expect(screen.getByText('Ledger Records')).toBeTruthy();
    expect(screen.getByText('The total value of all milk billed through this ledger, whether the buyer has paid yet or not.')).toBeTruthy();
    expect(screen.getByText("The total amount buyers currently owe you. This includes older debts that were added to a buyer's profile before you started using this daily ledger.")).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Search and filter transactions/i }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Auntie' } });

    expect(screen.queryByText('Posted Costs')).toBeNull();
    expect(screen.queryByText('Net Profit')).toBeNull();
    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({
        farm_id: 'farm-1',
        tenant_id: 'tenant-1',
        search_query: 'Auntie',
      }));
    });
  });

  it('toggles selected animals through a collapsible checkbox list', async () => {
    renderLedger();

    const expenseButtons = screen.getAllByRole('button', { name: 'Log Expense' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Log Expense' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Select Animals (0 selected)' }));

    const cowOne = await screen.findByLabelText('C-007');
    const cowTwo = await screen.findByLabelText('006');

    fireEvent.click(cowOne);
    fireEvent.click(cowTwo);

    expect(screen.getByRole('button', { name: 'Select Animals (2 selected)' })).toBeTruthy();
    expect(cowOne.checked).toBe(true);
    expect(cowTwo.checked).toBe(true);
  });
});