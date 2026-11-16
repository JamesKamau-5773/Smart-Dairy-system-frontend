import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const backendMocks = vi.hoisted(() => ({
  listLedgerEntries: vi.fn(),
  listAnimals: vi.fn(),
  getSummary: vi.fn(),
  getGroupTotals: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }),
}));

// The Ledger opens on the current year up to today.
vi.mock('../../../lib/localDate', async (importOriginal) => ({ ...(await importOriginal()), todayLocalIso: () => '2026-11-16' }));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { role: 'FARMER' } }),
}));

vi.mock('../../../lib/backendApi', () => ({
  financeApi: { listLedgerEntries: backendMocks.listLedgerEntries, categories: () => Promise.resolve({}) },
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

const THIS_YEAR = 'Totals for 2026';
const YEAR_DATES = { date_from: '2026-01-01', date_to: '2026-11-16' };

const renderLedger = (path = '/finance/ledger') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(
    MemoryRouter,
    { initialEntries: [path] },
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
  backendMocks.getGroupTotals.mockResolvedValue({ groups: [] });
  backendMocks.listAnimals.mockResolvedValue([
    { id: 'C-007', name: 'C-007' },
    { id: '006', name: '006' },
  ]);
});

describe('FinancialLedger summaries', () => {
  it('shows one strip of backend figures and no period toggle, chart or all-time balances', async () => {
    renderLedger();

    expect(await screen.findByText(THIS_YEAR)).toBeTruthy();
    const strip = screen.getByRole('region', { name: 'Money in and out' });
    // 1740000 cents → KES 17,400.00, with no client-side arithmetic.
    expect(within(strip).getByText('17,400')).toBeTruthy();
    expect(within(strip).getByText('14,200')).toBeTruthy();
    expect(within(strip).getAllByRole('term').map((term) => term.textContent)).toEqual(['Money in', 'Money out', 'Net', 'Unpaid']);
    expect(within(strip).getByRole('link', { name: /View full report/ }).getAttribute('href'))
      .toBe('/operations/reports?period=custom&start_date=2026-01-01&end_date=2026-11-16');

    expect(screen.queryByRole('button', { name: 'Next period' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Month' })).toBeNull();
    expect(screen.queryByRole('list', { name: /Money in and out by/ })).toBeNull();
    expect(screen.queryByText('Owed to you (all time)')).toBeNull();
    expect(screen.queryByText('Customer credit (now)')).toBeNull();
    expect(screen.queryByText(/Change in net/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ledger' })).toBeTruthy();
  });

  it('opens the table and the strip on the same period: this year up to today', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining(YEAR_DATES)));
    expect(backendMocks.getGroupTotals).toHaveBeenCalledWith({ ...YEAR_DATES, levels: 'year,month,day' });
    // Supported params only: the year, narrowed to 1 Jan – today.
    expect(backendMocks.getSummary).toHaveBeenCalledWith({ ...YEAR_DATES, period: 'year', anchor: '2026-01-01' });
    expect(screen.getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' })).toBeTruthy();
    // The default isn't a filter, so there is no chip to remove.
    expect(screen.queryByRole('button', { name: /^Remove filter/ })).toBeNull();
  });

  it('shows one Amount column: income plain, expenses negative, no KES, and badges only for unposted records', async () => {
    backendMocks.listLedgerEntries.mockResolvedValue({
      items: [
        { id: 1, date: '2026-11-03', transaction_type: 'Revenue', counterparty_name: 'Brookside Dairy', amount: 48600, status: 'POSTED', bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } },
        { id: 2, date: '2026-11-03', transaction_type: 'Expense', counterparty_name: 'Unga Feeds Ltd', amount: 15025, status: 'PENDING', bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } },
      ],
      meta: { total: 2 },
    });
    backendMocks.getGroupTotals.mockResolvedValue({ groups: [
      { level: 'year', key: '2026', label: '2026', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
      { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
      { level: 'day', key: '2026-11-03', parent: '2026-11', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
    ] });
    renderLedger();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent))
      .toEqual(['Customer / Supplier', 'Category', 'Ref', 'Description', 'Amount (KES)', 'Status', 'Actions']);
    // The current month keeps its own header between the year and the day.
    expect(await within(table).findByRole('button', { name: /^November, 2 records/ })).toBeTruthy();
    const rowOf = (name) => within(table).getByText(name).closest('tr');
    await within(table).findByText('Brookside Dairy');
    const income = rowOf('Brookside Dairy').querySelectorAll('td');
    const expense = rowOf('Unga Feeds Ltd').querySelectorAll('td');
    expect(income[4].textContent).toBe('48,600.00');
    expect(expense[4].textContent).toMatch(/^−minus 15,025\.00$/);
    expect(expense[4].querySelector('.text-money-negative')).toBeTruthy();
    expect(table.querySelector('.text-money-positive')).toBeNull();
    // Posted is normal and gets no badge; other statuses do.
    expect(income[5].textContent).toBe('');
    expect(expense[5].textContent).toBe('pending');
  });

  it('takes a date range from the address for the table, the group totals and the strip', async () => {
    renderLedger('/finance/ledger?from=2026-10-01&to=2026-10-15');

    const range = { date_from: '2026-10-01', date_to: '2026-10-15' };
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining(range)));
    expect(backendMocks.getGroupTotals).toHaveBeenCalledWith(expect.objectContaining(range));
    expect(backendMocks.getSummary).toHaveBeenCalledWith({ period: 'year', anchor: '2026-10-01', ...range });
    expect(await screen.findByText('Totals for 01 Oct 2026 – 15 Oct 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove filter 01 Oct 2026 – 15 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /View full report/ }).getAttribute('href'))
      .toBe('/operations/reports?period=custom&start_date=2026-10-01&end_date=2026-10-15');
  });

  it('ignores a reversed range in the address and opens on this year', async () => {
    renderLedger('/finance/ledger?from=2026-10-15&to=2026-10-01');
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalled());
    expect(backendMocks.listLedgerEntries.mock.calls[0][0]).toMatchObject(YEAR_DATES);
  });

  it('sets the date range from the toolbar, for the table and the strip together', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);

    // The date button names the range the table shows.
    fireEvent.click(screen.getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' }));
    const form = await screen.findByRole('form', { name: 'Custom date range' });
    fireEvent.change(within(form).getByLabelText('From'), { target: { value: '01/10/2026' } });
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '15/10/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({ date_from: '2026-10-01', date_to: '2026-10-15' }));
    });
    expect(backendMocks.getSummary).toHaveBeenLastCalledWith({ period: 'year', anchor: '2026-10-01', date_from: '2026-10-01', date_to: '2026-10-15' });
  });

  it('says the strip covers one year at a time for a range across two years, and requests no totals', async () => {
    renderLedger('/finance/ledger?from=2025-12-01&to=2026-01-15');
    const strip = await screen.findByRole('region', { name: 'Money in and out' });
    expect(await within(strip).findByText(/Totals cover one calendar year at a time/)).toBeTruthy();
    expect(within(strip).queryByRole('term')).toBeNull();
    expect(backendMocks.getSummary).not.toHaveBeenCalled();
    // The table still shows the chosen dates.
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining({ date_from: '2025-12-01', date_to: '2026-01-15' })));
  });

  it('says "No records" instead of a row of zeros when the API reports none', async () => {
    backendMocks.getSummary.mockResolvedValue({ ...novemberSummary, current: { income: '0', expenses: '0', net: '0', unpaid: '0', count: 0 } });
    renderLedger();
    const strip = await screen.findByRole('region', { name: 'Money in and out' });
    expect(await within(strip).findByText('No records')).toBeTruthy();
    expect(within(strip).queryByRole('term')).toBeNull();
  });

  it('sends every filter to the server for rows and totals, and shows it as a chip', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);

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
    expect(screen.getByRole('button', { name: 'Remove filter “Auntie”' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  it('says when a misspelt search was matched to a close customer name', async () => {
    backendMocks.listLedgerEntries.mockImplementation((params) => Promise.resolve(params.search_query
      ? { ...auntieResponse, summary_scope: { mode: 'search', search_query: 'Antie', typo_matched: true, matched_names: ['Auntie Grace'] } }
      : allAccountsResponse));
    renderLedger();

    await screen.findByText(THIS_YEAR);
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
