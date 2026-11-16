import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YieldLog from '../productionLog';

void React;
afterEach(cleanup);
// jsdom has no CSS.escape; the browser's is used to find the day to scroll to.
globalThis.CSS ??= { escape: (value) => value };
Element.prototype.scrollIntoView ??= () => {};

const api = vi.hoisted(() => ({ listYield: vi.fn(), getPeriodSummary: vi.fn(), getGroupTotals: vi.fn() }));

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('../../../lib/localDate', async (importOriginal) => ({ ...(await importOriginal()), todayLocalIso: () => '2026-11-16' }));
vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  const resolvesEmpty = () => vi.fn().mockResolvedValue([]);
  return {
    ...actual,
    productionApi: {
      listYield: api.listYield,
      getPeriodSummary: api.getPeriodSummary,
      getGroupTotals: api.getGroupTotals,
      listMilkDispositions: resolvesEmpty(),
      deleteYield: resolvesEmpty(),
      verifyYield: resolvesEmpty(),
    },
    safetyApi: { activeHardlocks: resolvesEmpty() },
    herdApi: { list: resolvesEmpty() },
  };
});

const row = (id, day, cow) => ({ id, cow_tag: cow, cow_name: cow, amount: '5.0', session: 'Evening', status: 'VERIFIED', milker: '254722263584', bucket: { year: '2026', month: day.slice(0, 7), day } });
const novemberRows = [row('y1', '2026-11-15', 'Joyce'), row('y2', '2026-11-07', 'Sofia')];

const renderLog = (path = '/operations/yield') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><YieldLog /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  // Rows exist this year; the one-day view of 10 Nov is empty.
  api.listYield.mockImplementation((params) => Promise.resolve(params.date_from === '2026-11-10' ? [] : novemberRows));
  api.getGroupTotals.mockResolvedValue({ groups: [
    { level: 'year', key: '2026', label: '2026', litres: '10.0', entries: 2 },
    { level: 'month', key: '2026-11', parent: '2026', label: 'November', litres: '10.0', entries: 2 },
    { level: 'day', key: '2026-11-15', parent: '2026-11', litres: '5.0', entries: 1 },
    { level: 'day', key: '2026-11-07', parent: '2026-11', litres: '5.0', entries: 1 },
  ] });
  api.getPeriodSummary.mockResolvedValue({ label: 'Nov 2026', current: { litres: '246.0', entries: 36, avg_litres_per_day: '41.0' } });
});

describe('Production Log summary strip', () => {
  it('shows total milk and avg per day (no Available) for the same period as the table: this year', async () => {
    renderLog();
    const strip = await screen.findByRole('region', { name: 'Milk totals' });
    await within(strip).findByText('246.0 L');
    expect(within(strip).getAllByRole('term').map((term) => term.textContent)).toEqual(['Total milk', 'Avg per day']);
    expect(within(strip).queryByText('—')).toBeNull();
    expect(within(strip).getByText('Totals for 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: '01 Jan 2026 – 16 Nov 2026' })).toBeTruthy();
    expect(within(strip).getByRole('link', { name: /View full report/ }).getAttribute('href')).toBe('/operations/reports/milk-inventory');
    expect(screen.queryByRole('group', { name: 'Period' })).toBeNull();
    const month = { date_from: '2026-01-01', date_to: '2026-11-16' };
    expect(api.listYield).toHaveBeenCalledWith(month);
    expect(api.getGroupTotals).toHaveBeenCalledWith({ ...month, levels: 'year,month,day' });
    expect(api.getPeriodSummary).toHaveBeenCalledWith({ ...month, period: 'year', anchor: '2026-01-01' });
  });

  it('orders the columns Session, Cow, Litres, Milker, Status, Actions, with litres unitless and badges only when not verified', async () => {
    renderLog();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent))
      .toEqual(['Session', 'Cow', 'Litres', 'Milker', 'Status', 'Actions']);
    const cells = (await within(table).findByText('Joyce · Joyce')).closest('tr').querySelectorAll('td');
    expect(cells[2].textContent).toBe('5.0');
    // The milker's phone is formatted for display only.
    expect(cells[3].textContent).toBe('+254 722 263 584');
    // Verified is normal: no badge.
    expect(cells[4].textContent).toBe('');
    // Group totals stay in the Litres column, without the unit.
    const november = within(table).getByRole('button', { name: /^November, 2 entries/ }).closest('tr').querySelectorAll('td');
    expect(november[1].textContent).toBe('10.0');
  });

  it('says "No entries · last entry" only when the table is empty too, and opens that day from the link', async () => {
    api.getPeriodSummary.mockImplementation((params) => Promise.resolve(params.date_from === '2026-11-10'
      ? { label: '10 Nov 2026', current: { litres: '0.0', entries: 0, last_entry_date: '2026-11-07' } }
      : { label: 'Nov 2026', current: { litres: '10.0', entries: 2, avg_litres_per_day: '5.0' } }));
    renderLog('/operations/yield?from=2026-11-10&to=2026-11-10');

    const strip = await screen.findByRole('region', { name: 'Milk totals' });
    await within(strip).findByText(/No entries/);
    expect(within(strip).queryByRole('term')).toBeNull();

    fireEvent.click(within(strip).getByRole('button', { name: '07 Nov 2026' }));

    await waitFor(() => expect(api.listYield).toHaveBeenLastCalledWith({ date_from: '2026-11-01', date_to: '2026-11-07' }));
    const table = await screen.findByRole('table');
    const day = await within(table).findByRole('button', { name: /^Sat 07 Nov/ });
    await waitFor(() => expect(day.getAttribute('aria-expanded')).toBe('true'));
  });

  it('keeps the strip figures when the summary says 0 but the table has entries', async () => {
    api.getPeriodSummary.mockResolvedValue({ label: 'Nov 2026', current: { litres: '0.0', entries: 0, avg_litres_per_day: '0.0' } });
    renderLog();
    const strip = await screen.findByRole('region', { name: 'Milk totals' });
    await screen.findByRole('table');
    await within(screen.getByRole('table')).findByText('Joyce · Joyce');
    expect(within(strip).queryByText(/No entries/)).toBeNull();
    expect(within(strip).getAllByRole('term')).toHaveLength(2);
  });

  it('still reads an older one-day link (?date=)', async () => {
    renderLog('/operations/yield?date=2026-11-10');
    await waitFor(() => expect(api.listYield).toHaveBeenCalledWith({ date_from: '2026-11-10', date_to: '2026-11-10' }));
  });
});
