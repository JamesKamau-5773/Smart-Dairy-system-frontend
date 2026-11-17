import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YieldLog from '../productionLog';

void React;
afterEach(cleanup);
// jsdom has no CSS.escape; the browser's is used to find the day to scroll to.
globalThis.CSS ??= { escape: (value) => value };
Element.prototype.scrollIntoView ??= () => {};

const api = vi.hoisted(() => ({ listYield: vi.fn(), getPeriodSummary: vi.fn(), getGroupTotals: vi.fn(), yieldTotals: vi.fn(), listMilkDispositionsWithTotals: vi.fn() }));

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
      yieldTotals: api.yieldTotals,
      listMilkDispositionsWithTotals: api.listMilkDispositionsWithTotals,
      listMilkDispositions: resolvesEmpty(),
      deleteYield: resolvesEmpty(),
      verifyYield: resolvesEmpty(),
    },
    safetyApi: { activeHardlocks: resolvesEmpty() },
    herdApi: { list: resolvesEmpty() },
  };
});

const row = (id, day, cow, extra = {}) => ({ id, cow_tag: cow, cow_name: cow, amount: '5.0', session: 'Evening', status: 'VERIFIED', milker: '254722263584', bucket: { year: '2026', month: day.slice(0, 7), day }, ...extra });
const novemberRows = [
  row('y1', '2026-11-15', 'Joyce'),
  row('y2', '2026-11-15', 'Sofia', { session: 'Midday', amount: '6.5', status: 'FLAGGED', vs_avg_litres: '-2.1', significant_drop: true, recorded_via: 'whatsapp' }),
];

const renderLog = (path = '/operations/yield') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><YieldLog /></MemoryRouter>
  </QueryClientProvider>,
);

const yearParams = { date_from: '2026-01-01', date_to: '2026-11-16' };

beforeEach(() => {
  vi.clearAllMocks();
  api.listYield.mockResolvedValue(novemberRows);
  api.getGroupTotals.mockResolvedValue({ groups: [
    { level: 'year', key: '2026', label: '2026', litres: '11.5', entries: 2 },
    { level: 'month', key: '2026-11', parent: '2026', label: 'November', litres: '11.5', entries: 2 },
    { level: 'day', key: '2026-11-15', parent: '2026-11', litres: '11.5', entries: 2 },
  ] });
  api.getPeriodSummary.mockResolvedValue({ label: '2026', current: { litres: '3761.0', entries: 563, avg_litres_per_day: '11.8' } });
  api.yieldTotals.mockResolvedValue({ totalRecords: 2, totalLitres: 11.5, verified: 560, pending: 1, flagged: 2, isolated: 0 });
  api.listMilkDispositionsWithTotals.mockResolvedValue({
    items: [{ id: 'd1', date: '2026-11-11', calfId: 9, calfName: 'Success', calfTag: 'S-009', liters: 4, notes: '' }],
    count: 53,
    totalLitres: null,
  });
});

const cellsOf = async (table, cow) => (await within(table).findByText(`${cow} · ${cow}`)).closest('tr').querySelectorAll('td');

describe('Production Log', () => {
  it('shows the backend’s total volume and status counts for the same filters as the table', async () => {
    renderLog();
    const tiles = await screen.findByRole('region', { name: 'Milk totals' });
    await within(tiles).findByText('3,761.0');
    expect(within(tiles).getAllByRole('term').map((term) => term.textContent))
      .toEqual(['Total Volume', 'Verified Entries', 'Pending Entries', 'Flagged Entries']);
    expect(within(tiles).getAllByRole('definition').map((value) => value.textContent)).toEqual(['3,761.0L', '560', '1', '2']);

    expect(api.listYield).toHaveBeenCalledWith(yearParams);
    expect(api.yieldTotals).toHaveBeenCalledWith(yearParams);
    expect(api.getGroupTotals).toHaveBeenCalledWith({ ...yearParams, levels: 'year,month,day' });
    expect(api.getPeriodSummary).toHaveBeenCalledWith({ ...yearParams, period: 'year', anchor: '2026-01-01' });
  });

  it('shows "—" for a count the backend didn’t send, never a zero', async () => {
    api.yieldTotals.mockResolvedValue({ totalRecords: null, totalLitres: null, verified: null, pending: null, flagged: null, isolated: null });
    renderLog();
    const tiles = await screen.findByRole('region', { name: 'Milk totals' });
    await waitFor(() => expect(within(tiles).getAllByRole('definition')[1].textContent).toBe('—'));
  });

  it('puts each record’s litres in its own session column, including Midday', async () => {
    renderLog();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(
      ['', 'Cow', 'Morning', 'Midday', 'Evening', 'Milker', 'Total (L)', 'Status', 'vs 5-day Avg', 'Recorded By', 'Actions'],
    );

    const evening = await cellsOf(table, 'Joyce');
    expect([...evening].slice(2, 5).map((td) => td.textContent)).toEqual(['', '', '5.0']);
    expect(evening[5].textContent).toBe('+254 722 263 584');
    expect(evening[6].textContent).toBe('5.0');
    expect(evening[7].textContent).toContain('Verified');
    // Not sent by the backend yet: shown as unknown, never worked out.
    expect(evening[8].textContent).toBe('—');
    expect(evening[9].textContent).toBe('—');

    const midday = await cellsOf(table, 'Sofia');
    expect([...midday].slice(2, 5).map((td) => td.textContent)).toEqual(['', '6.5', '']);
    expect(midday[7].textContent).toContain('Flagged');
    expect(midday[8].textContent).toBe('−2.1 L');
    expect(midday[8].className).toContain('text-danger-900');
    expect(midday[9].textContent).toBe('WhatsApp');
  });

  it('gives phones a card per record instead of a table that scrolls sideways', async () => {
    renderLog();
    const table = await screen.findByRole('table');
    expect(table.parentElement.className).toBe('hidden md:block overflow-x-auto');
    const card = (await screen.findAllByText('Sofia · Sofia')).map((node) => node.closest('article')).find(Boolean);
    expect(card.parentElement.closest('.md\\:hidden')).toBeTruthy();
    expect(within(card).getByText('6.5 L')).toBeTruthy();
    expect(within(card).getByText('Flagged')).toBeTruthy();
    expect(within(card).getByText('−2.1 L')).toBeTruthy();
    expect(within(card).getByText('WhatsApp')).toBeTruthy();
  });

  it('puts group totals under Total (L), with the entry count by the label', async () => {
    renderLog();
    const table = await screen.findByRole('table');
    const november = (await within(table).findByRole('button', { name: /^November, 2 entries/ })).closest('tr').querySelectorAll('td');
    expect(november[0].getAttribute('colspan')).toBe('6');
    expect(november[0].textContent).toContain('2 entries');
    expect(november[1].textContent).toBe('11.5');
  });

  it('says how many records are listed out of the backend’s total', async () => {
    renderLog();
    expect(await screen.findByText('Showing all 2 of 2 records')).toBeTruthy();
  });

  it('shows the latest calf feedings with the backend’s count, and "—" for litres it didn’t send', async () => {
    renderLog();
    const calves = await screen.findByRole('region', { name: 'Recent calf milk allocations' });
    expect(await within(calves).findByText('53 feedings · — allocated')).toBeTruthy();
    // A table from md up and a list on phones: both name the calf.
    expect(within(calves).getAllByRole('link', { name: 'Success · S-009' })).toHaveLength(2);
    expect(calves.querySelector('table').parentElement.className).toBe('hidden overflow-x-auto md:block');
  });

  it('still reads an older one-day link (?date=)', async () => {
    renderLog('/operations/yield?date=2026-11-10');
    await waitFor(() => expect(api.listYield).toHaveBeenCalledWith({ date_from: '2026-11-10', date_to: '2026-11-10' }));
  });
});
