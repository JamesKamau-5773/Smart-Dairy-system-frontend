import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const backendMocks = vi.hoisted(() => ({
  listLedgerEntries: vi.fn(),
  getLedgerBalances: vi.fn(),
  listAnimals: vi.fn(),
  getSummary: vi.fn(),
  getGroupTotals: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { role: 'FARMER' } }),
}));

vi.mock('../../../lib/backendApi', () => ({
  financeApi: { listLedgerEntries: backendMocks.listLedgerEntries, getLedgerBalances: backendMocks.getLedgerBalances, categories: () => Promise.resolve({}) },
  ledgerApi: { getSummary: backendMocks.getSummary, getGroupTotals: backendMocks.getGroupTotals },
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

const novemberSummary = {
  period: 'month', key: '2026-11', label: 'Nov 2026',
  range: { from: '2026-11-01', to: '2026-11-30' },
  has_next: false,
  current: { income: '1740000', expenses: '320000', net: '1420000', unpaid: '150000', count: 29 },
  previous: { key: '2026-10', label: 'Oct 2026', income: '0', expenses: '0', net: '1500000', unpaid: '0', count: 80 },
  change: { net_abs: '-80000', net_pct: '-5.3' },
  breakdown: [],
};

const renderLedger = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(
    MemoryRouter,
    null,
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(FinancialLedger)),
  ));
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  backendMocks.listLedgerEntries.mockImplementation((params) => (
    Promise.resolve(params.search_query ? auntieResponse : allAccountsResponse)
  ));
  backendMocks.getSummary.mockResolvedValue(novemberSummary);
  backendMocks.getLedgerBalances.mockResolvedValue({ outstanding_receivables: 24110, customer_credit: 636 });
  backendMocks.getGroupTotals.mockResolvedValue({ groups: [] });
  backendMocks.listAnimals.mockResolvedValue([
    { id: 'C-007', name: 'C-007' },
    { id: '006', name: '006' },
  ]);
});

describe('FinancialLedger summaries', () => {
  it('shows the backend period totals exactly, each figure with its scope, and no navy block', async () => {
    renderLedger();

    expect(await screen.findByText('Nov 2026')).toBeTruthy();
    // 1740000 cents → KES 17,400.00, with no client-side arithmetic.
    expect(screen.getByText('17,400')).toBeTruthy();
    expect(screen.getByText('14,200')).toBeTruthy();
    expect(screen.getByLabelText('down 5.3% vs Oct 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next period' }).disabled).toBe(true);
    expect(backendMocks.getSummary).toHaveBeenCalledWith(expect.objectContaining({ period: 'month' }));

    expect(screen.getByText('Unpaid in Nov 2026')).toBeTruthy();
    expect(screen.getByText('Owed to you (all time)')).toBeTruthy();
    expect(screen.getByText('Customer credit (now)')).toBeTruthy();
    expect(screen.getByText('Records in Nov 2026')).toBeTruthy();
    expect(await screen.findByText('24,110')).toBeTruthy();
    expect(screen.queryByText('Unpaid Money')).toBeNull();
    expect(screen.queryByText(/follow every filter/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ledger' })).toBeTruthy();
    // The all-time balances are never narrowed by the period or filters.
    expect(backendMocks.getLedgerBalances).toHaveBeenCalledWith({ farm_id: 'farm-1', tenant_id: 'tenant-1' });
  });

  it('scopes the table to the period range the API resolved', async () => {
    renderLedger();
    await screen.findByText('Nov 2026');
    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining({ date_from: '2026-11-01', date_to: '2026-11-30' }));
    });
    expect(backendMocks.getGroupTotals).toHaveBeenCalledWith(expect.objectContaining({ date_from: '2026-11-01', date_to: '2026-11-30', levels: 'year,month,day' }));
    // The period is the page's only date control.
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  it('uses a custom dd/mm/yyyy range for the summary and the table', async () => {
    renderLedger();
    await screen.findByText('Nov 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const form = await screen.findByRole('form', { name: 'Custom date range' });
    fireEvent.change(within(form).getByLabelText('From'), { target: { value: '01102026' } });
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '15/10/2026' } });
    expect(within(form).getByLabelText('From').value).toBe('01/10/2026');
    // A To date after today is refused (the range picker never offers the future).
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '31/12/2099' } });
    expect(within(form).getByText(/Use a date on or before/)).toBeTruthy();
    expect(within(form).getByRole('button', { name: 'Apply' }).disabled).toBe(true);
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '15/10/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(backendMocks.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ period: 'custom', date_from: '2026-10-01', date_to: '2026-10-15' }));
    });
    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({ date_from: '2026-10-01', date_to: '2026-10-15' }));
    });
    expect(screen.getByText('01 Oct 2026 – 15 Oct 2026')).toBeTruthy();
  });

  it('says when there is no previous-period data', async () => {
    backendMocks.getSummary.mockResolvedValue({ ...novemberSummary, previous: { ...novemberSummary.previous, count: 0 }, change: null });
    renderLedger();
    expect(await screen.findByText('No Oct 2026 data')).toBeTruthy();
  });

  it('sends every filter to the server for rows and totals, and shows it as a chip', async () => {
    renderLedger();
    await screen.findByText('Nov 2026');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Auntie' } });

    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({
        farm_id: 'farm-1',
        tenant_id: 'tenant-1',
        search: 'Auntie',
        search_query: 'Auntie',
      }));
    });
    expect(backendMocks.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Auntie' }));
    expect(backendMocks.getGroupTotals).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Auntie' }));
    expect(screen.getByText('Filtered: “Auntie”')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  it('says when a misspelt search was matched to a close customer name', async () => {
    backendMocks.listLedgerEntries.mockImplementation((params) => Promise.resolve(params.search_query
      ? { ...auntieResponse, summary_scope: { mode: 'search', search_query: 'Antie', typo_matched: true, matched_names: ['Auntie Grace'] } }
      : allAccountsResponse));
    renderLedger();

    await screen.findByText('Nov 2026');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Antie' } });

    expect(await screen.findByText('No exact match for “Antie”. Showing results for Auntie Grace.')).toBeTruthy();
  });

  it('toggles selected animals through a collapsible checkbox list', async () => {
    renderLedger();

    fireEvent.click(screen.getAllByRole('button', { name: 'Log expense' })[0]);
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
