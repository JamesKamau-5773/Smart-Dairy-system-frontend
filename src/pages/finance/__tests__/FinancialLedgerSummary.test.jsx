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
import { stubMatchMedia, unstubMatchMedia } from '../../../test/matchMedia';
import { TABLE_QUERY } from '../../../hooks/useMediaQuery';

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
    profit_margin_pct: '-2.2',
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
afterEach(unstubMatchMedia);

beforeEach(() => {
  vi.clearAllMocks();
  // The desktop table layout unless a test says otherwise (jsdom has no matchMedia).
  stubMatchMedia([TABLE_QUERY]);
  backendMocks.listLedgerEntries.mockImplementation((params) => (
    Promise.resolve(params.search_query ? auntieResponse : allAccountsResponse)
  ));
  backendMocks.getGroupTotals.mockResolvedValue({ groups: [] });
  backendMocks.listAnimals.mockResolvedValue([
    { id: 'C-007', name: 'C-007' },
    { id: '006', name: '006' },
  ]);
});

// The filter panel is collapsed by default; tests that use a control open it first.
const PANEL = 'Search and filter transactions';
const openFilters = async () => {
  const toggle = await screen.findByRole('button', { name: new RegExp(`^${PANEL}`) });
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
  return screen.getByRole('region', { name: PANEL });
};
const kpiSection = () => screen.findByRole('region', { name: 'Ledger totals' });

describe('FinancialLedger summaries', () => {
  it('shows the six KPI cards from the list response, under the full-report link', async () => {
    const { container } = renderLedger();

    expect(await screen.findByText(THIS_YEAR)).toBeTruthy();
    const kpis = await kpiSection();
    expect(within(kpis).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Total sales', 'Posted costs', 'Net profit', 'Customer credit', 'Unpaid money', 'Profit margin',
    ]);
    const valueOf = (label) => within(kpis).getByText(label, { selector: 'span' }).closest('div').querySelector('dd').textContent;
    expect(valueOf('Total sales')).toMatch(/KES\s?21,280\.00/);
    expect(valueOf('Posted costs')).toMatch(/KES\s?21,755\.00/);
    expect(valueOf('Net profit')).toMatch(/^−minus KES\s?475\.00$/);
    expect(valueOf('Customer credit')).toMatch(/KES\s?636\.00/);
    expect(valueOf('Unpaid money')).toMatch(/KES\s?24,110\.00/);
    // From the API (BR-030), never divided in the browser.
    expect(valueOf('Profit margin')).toBe('−2.2%');
    expect(within(kpis).getByRole('link', { name: 'View full report' }).getAttribute('href'))
      .toBe('/operations/reports?period=custom&start_date=2026-01-01&end_date=2026-11-16');
    // ⓘ where the design has them.
    expect(within(kpis).getByRole('button', { name: 'About Total sales' })).toBeTruthy();
    expect(within(kpis).getByRole('button', { name: 'About Unpaid money' })).toBeTruthy();

    // The cards come with the rows: no separate summary request.
    expect(backendMocks.getSummary).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Financial Ledger' })).toBeTruthy();
    expect(screen.getByText('All income and expense transactions.')).toBeTruthy();
    // One primary button, rightmost; Log expense is outlined.
    expect(container.querySelectorAll('.btn-command')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Log income' }).className).toContain('btn-command');
    expect(screen.getByRole('button', { name: 'Log expense' }).className).toContain('btn-outline-brand');
    expect(container.querySelector('.font-mono')).toBeNull();
  });

  it('shows — for a figure the API did not send', async () => {
    const withoutMargin = { ...allAccountsResponse.summary };
    delete withoutMargin.profit_margin_pct;
    backendMocks.listLedgerEntries.mockResolvedValue({ ...allAccountsResponse, summary: withoutMargin });
    renderLedger();
    const kpis = await kpiSection();
    await within(kpis).findByText('Profit margin', { selector: 'span' });
    expect(within(kpis).getByText('Profit margin', { selector: 'span' }).closest('div').querySelector('dd').textContent).toBe('—');
  });

  it('opens on this year up to today, with the filter panel collapsed and nothing to reset', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining(YEAR_DATES)));
    expect(backendMocks.getGroupTotals).toHaveBeenCalledWith({ ...YEAR_DATES, levels: 'year,month,day' });

    const toggle = screen.getByRole('button', { name: PANEL });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();

    const panel = await openFilters();
    // One date-range control, no native date inputs.
    expect(within(panel).getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' })).toBeTruthy();
    expect(panel.querySelector('input[type="date"]')).toBeNull();
    expect(within(panel).getByText('Showing 161 ledger records')).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'About Ledger totals' })).toBeTruthy();
  });

  it('shows the columns, signed amounts with their currency, a badge per status and receipt links', async () => {
    backendMocks.listLedgerEntries.mockResolvedValue({
      items: [
        { id: 1, date: '2026-11-03', transaction_type: 'Revenue', counterparty_name: 'Brookside Dairy', amount: 48600, status: 'POSTED', reference_code: 'MPESA-7731', receipt_available: true, receipt: { id: 9 }, bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } },
        { id: 2, date: '2026-11-03', transaction_type: 'Expense', counterparty_name: 'Unga Feeds Ltd', amount: 15025, status: 'PENDING', bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } },
      ],
      meta: { total: 2 },
      summary: allAccountsResponse.summary,
    });
    backendMocks.getGroupTotals.mockResolvedValue({ groups: [
      { level: 'year', key: '2026', label: '2026', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
      { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
      { level: 'day', key: '2026-11-03', parent: '2026-11', count: 2, income: '4860000', expenses: '1502500', net: '3357500' },
    ] });
    renderLedger();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent))
      .toEqual(['Customer / Supplier', 'Category', 'Description', 'Ref Code', 'Amount', 'Status', 'Receipt', 'Actions']);
    expect(await within(table).findByRole('button', { name: /^November, 2 records/ })).toBeTruthy();
    // The day group carries the date; rows don't repeat it.
    expect(within(table).getByRole('button', { name: /^03 Nov 2026, 2 records/ })).toBeTruthy();
    const rowOf = (name) => within(table).getByText(name).closest('tr');
    await within(table).findByText('Brookside Dairy');
    const income = rowOf('Brookside Dairy').querySelectorAll('td');
    const expense = rowOf('Unga Feeds Ltd').querySelectorAll('td');
    expect(income[3].textContent).toBe('MPESA-7731');
    expect(expense[3].textContent).toBe('—');
    expect(income[4].textContent).toMatch(/^KES\s?48,600\.00$/);
    expect(expense[4].textContent).toMatch(/^−minus KES\s?15,025\.00$/);
    expect(expense[4].querySelector('.text-money-negative')).toBeTruthy();
    expect(table.querySelector('.text-money-positive')).toBeNull();
    expect(income[5].textContent).toBe('Posted');
    expect(expense[5].textContent).toBe('Pending');
    expect(within(income[6]).getByRole('button', { name: 'View receipt' })).toBeTruthy();
    expect(expense[6].textContent).toBe('');
    expect(table.textContent).not.toMatch(/N\/A|See more/);
  });

  it('opens a row to show its full description', async () => {
    backendMocks.listLedgerEntries.mockResolvedValue({
      items: [{ id: 1, date: '2026-11-03', transaction_type: 'Expense', counterparty_name: 'KRA / NSSF / SHA', item_name: 'Payroll statutory deductions', description: 'PAYE, NSSF, SHIF and Housing Levy for October', amount: 17152.56, status: 'POSTED', bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } }],
      meta: { total: 1 },
      summary: allAccountsResponse.summary,
    });
    renderLedger();
    const table = await screen.findByRole('table');
    const row = (await within(table).findByText('KRA / NSSF / SHA')).closest('tr');
    expect(within(table).queryByText('Reference')).toBeNull();
    // A click anywhere on the row opens it.
    fireEvent.click(row.querySelector('td'));
    expect(within(table).getByText('Payroll statutory deductions · PAYE, NSSF, SHIF and Housing Levy for October')).toBeTruthy();
    expect(within(row).getByRole('button', { expanded: true })).toBeTruthy();
  });

  it('takes a date range from the address for the table, the group totals and the cards', async () => {
    renderLedger('/finance/ledger?from=2026-10-01&to=2026-10-15');

    const range = { date_from: '2026-10-01', date_to: '2026-10-15' };
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining(range)));
    expect(backendMocks.getGroupTotals).toHaveBeenCalledWith(expect.objectContaining(range));
    expect(await screen.findByText('Totals for 01 Oct 2026 – 15 Oct 2026')).toBeTruthy();
    // Collapsed, the panel says a filter is set; the range counts once.
    expect(screen.getByRole('button', { name: `${PANEL} · 1 filter active` })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View full report' }).getAttribute('href'))
      .toBe('/operations/reports?period=custom&start_date=2026-10-01&end_date=2026-10-15');
  });

  it('ignores a reversed range in the address and opens on this year', async () => {
    renderLedger('/finance/ledger?from=2026-10-15&to=2026-10-01');
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalled());
    expect(backendMocks.listLedgerEntries.mock.calls[0][0]).toMatchObject(YEAR_DATES);
  });

  it('sets the date range from the panel, for the table and the cards together', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);
    const panel = await openFilters();

    fireEvent.click(within(panel).getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' }));
    const form = await screen.findByRole('form', { name: 'Custom date range' });
    fireEvent.change(within(form).getByLabelText('From'), { target: { value: '01/10/2026' } });
    fireEvent.change(within(form).getByLabelText('To'), { target: { value: '15/10/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({ date_from: '2026-10-01', date_to: '2026-10-15' }));
    });
    expect(await screen.findByText('Totals for 01 Oct 2026 – 15 Oct 2026')).toBeTruthy();
  });

  it('shows the cards for a range across two years (they come with the rows)', async () => {
    renderLedger('/finance/ledger?from=2025-12-01&to=2026-01-15');
    const kpis = await kpiSection();
    expect(await within(kpis).findByText('Total sales', { selector: 'span' })).toBeTruthy();
    await waitFor(() => expect(backendMocks.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining({ date_from: '2025-12-01', date_to: '2026-01-15' })));
  });

  it('sends every filter to the server, counts it, and resets them all', async () => {
    renderLedger();
    await screen.findByText(THIS_YEAR);
    const panel = await openFilters();

    fireEvent.change(within(panel).getByRole('searchbox'), { target: { value: 'Auntie' } });
    fireEvent.change(within(panel).getByRole('combobox', { name: 'Type' }), { target: { value: 'revenue' } });

    await waitFor(() => {
      expect(backendMocks.listLedgerEntries).toHaveBeenLastCalledWith(expect.objectContaining({
        farm_id: 'farm-1',
        tenant_id: 'tenant-1',
        type: 'revenue',
        search: 'Auntie',
        search_query: 'Auntie',
      }));
    });
    expect(backendMocks.getGroupTotals).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Auntie', type: 'revenue' }));
    // The cards follow the search (the API's summary for "Auntie").
    const kpis = await kpiSection();
    await waitFor(() => expect(within(kpis).getByText('Total sales', { selector: 'span' }).closest('div').querySelector('dd').textContent).toMatch(/2,200\.00/));

    // Collapsed, the header counts the filters.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${PANEL}`) }));
    expect(screen.getByRole('button', { name: `${PANEL} · 2 filters active` })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();
    expect(screen.getByRole('button', { name: PANEL })).toBeTruthy();
  });

  it('says when a misspelt search was matched to a close customer name', async () => {
    backendMocks.listLedgerEntries.mockImplementation((params) => Promise.resolve(params.search_query
      ? { ...auntieResponse, summary_scope: { mode: 'search', search_query: 'Antie', typo_matched: true, matched_names: ['Auntie Grace'] } }
      : allAccountsResponse));
    renderLedger();

    await screen.findByText(THIS_YEAR);
    const panel = await openFilters();
    fireEvent.change(within(panel).getByRole('searchbox'), { target: { value: 'Antie' } });

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

describe('FinancialLedger on phones and tablets (below xl)', () => {
  const NOV = (day) => ({ year: '2026', month: '2026-11', day });
  const records = [
    { id: 1, date: '2026-11-18', transaction_type: 'Revenue', counterparty_name: 'Auntie', category: 'Milk Sale', amount: 70, status: 'POSTED', reference_code: 'MPESA-7731', receipt_available: true, receipt: { id: 9 }, bucket: NOV('2026-11-18') },
    { id: 2, date: '2026-11-03', transaction_type: 'Expense', counterparty_name: 'Employees', category: 'Labour', item_name: 'Monthly payroll', description: 'Payroll for 2026-10', amount: 53786.69, status: 'PENDING', bucket: NOV('2026-11-03') },
  ];

  beforeEach(() => {
    stubMatchMedia([]);
    backendMocks.listLedgerEntries.mockResolvedValue({ items: records, meta: { total: 2 }, summary: allAccountsResponse.summary });
    backendMocks.getGroupTotals.mockResolvedValue({ groups: [
      { level: 'year', key: '2026', label: '2026', count: 2, income: '7000', expenses: '5378669', net: '-5371669' },
      { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 2, income: '7000', expenses: '5378669', net: '-5371669' },
      { level: 'day', key: '2026-11-18', parent: '2026-11', count: 1, income: '7000', expenses: '0', net: '7000' },
      { level: 'day', key: '2026-11-03', parent: '2026-11', count: 1, income: '0', expenses: '5378669', net: '-5378669' },
    ] });
  });

  it('lists the same six figures as label / value rows under "Summary · 2026"', async () => {
    renderLedger();
    const kpis = await kpiSection();
    expect(await within(kpis).findByText('Summary · 2026')).toBeTruthy();
    expect(within(kpis).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Total sales', 'Posted costs', 'Net profit', 'Customer credit', 'Unpaid money', 'Profit margin',
    ]);
    expect(within(kpis).getByRole('link', { name: 'View full report' })).toBeTruthy();
    expect(within(kpis).getByRole('button', { name: 'About Unpaid money' })).toBeTruthy();
  });

  it('stacks the filters with visible labels inside the same panel', async () => {
    renderLedger();
    const panel = await openFilters();
    expect(within(panel).getByText('Search records')).toBeTruthy();
    expect(within(panel).getByText('Type')).toBeTruthy();
    expect(within(panel).getByText('Category')).toBeTruthy();
    expect(within(panel).getByText('Date range')).toBeTruthy();
    expect(within(panel).getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' })).toBeTruthy();
    expect(await within(panel).findByText('Showing 2 ledger records')).toBeTruthy();
  });

  it('shows two-line rows under months and days, without the table, the ⋮ menu or ref codes', async () => {
    renderLedger();
    const row = await screen.findByRole('button', { name: /^Employees/ });
    expect(screen.queryByRole('table')).toBeNull();
    // Within one year the year row is left out; the month opens and closes.
    expect(screen.queryByRole('button', { name: /^2026,/ })).toBeNull();
    const month = screen.getByRole('button', { name: /^November, 2 records/ });
    expect(month.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('heading', { name: /^18 Nov 2026/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^03 Nov 2026/ })).toBeTruthy();

    // Amount in the text colour; the minus shows the direction. A badge only when not Posted.
    expect(row.textContent).toMatch(/−minus KES\s?53,786\.69/);
    expect(row.querySelector('.text-money-negative')).toBeNull();
    expect(row.textContent).toContain('Pending');
    const posted = screen.getByRole('button', { name: /^Auntie/ });
    expect(posted.textContent).not.toContain('Posted');
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
    expect(screen.queryByText('MPESA-7731')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View receipt' })).toBeNull();

    fireEvent.click(month);
    expect(month.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /^Employees/ })).toBeNull();
  });

  it('opens a record’s sheet from its row, with its fields and actions, and closes it back to the row', async () => {
    renderLedger();
    const row = await screen.findByRole('button', { name: /^Employees/ });
    row.focus();
    fireEvent.click(row);

    const sheet = screen.getByRole('dialog', { name: 'Employees' });
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    expect(sheet.textContent).toMatch(/−minus KES\s?53,786\.69/);
    expect(within(sheet).getByText('03 Nov 2026')).toBeTruthy();
    expect(within(sheet).getAllByRole('term').map((term) => term.textContent)).toEqual(['Type', 'Category', 'Description']);
    expect(within(sheet).getByText('Expense')).toBeTruthy();
    expect(within(sheet).getByText('Monthly payroll · Payroll for 2026-10')).toBeTruthy();
    // No reference was sent, so none is shown; no receipt, so no "View receipt".
    expect(within(sheet).queryByText('Reference')).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'View receipt' })).toBeNull();

    // "More actions" opens the same items as the table's ⋮ menu (a Pending entry can't be corrected).
    fireEvent.click(within(sheet).getByRole('button', { name: 'More actions' }));
    expect(within(sheet).getByRole('button', { name: 'Add photo' })).toBeTruthy();
    expect(within(sheet).queryByRole('button', { name: 'Correct' })).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(row);
  });

  it('offers "View receipt" in the sheet when the record has one, and closes from ✕', async () => {
    renderLedger();
    fireEvent.click(await screen.findByRole('button', { name: /^Auntie/ }));
    const sheet = screen.getByRole('dialog', { name: 'Auntie' });
    expect(within(sheet).getByRole('button', { name: 'View receipt' })).toBeTruthy();
    expect(within(sheet).getByText('Posted')).toBeTruthy();
    expect(within(sheet).getByText('MPESA-7731')).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: 'More actions' }));
    expect(within(sheet).getByRole('button', { name: 'Correct' })).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the sheet and opens the correction form from "More actions"', async () => {
    renderLedger();
    fireEvent.click(await screen.findByRole('button', { name: /^Auntie/ }));
    const sheet = screen.getByRole('dialog', { name: 'Auntie' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'More actions' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Correct' }));
    expect(screen.queryByRole('dialog', { name: 'Auntie' })).toBeNull();
    expect(await screen.findByRole('dialog', { name: 'Correct income' })).toBeTruthy();
  });
});
