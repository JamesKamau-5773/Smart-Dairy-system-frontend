import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GroupedDataTable from '../GroupedDataTable';
import { cellClass } from '../DataTable';
import { productionGroupConfig } from '../../periods/periodConfigs';
import { toProductionGroupTotals } from '../../../lib/periodTotals';

afterEach(cleanup);

vi.mock('../../../lib/localDate', async (importOriginal) => ({ ...(await importOriginal()), todayLocalIso: () => '2026-11-16' }));

const columns = [
  { id: 'session', header: 'Session', width: 'w-[8rem]' },
  { id: 'cow', header: 'Cow' },
  { id: 'total', header: 'Litres', align: 'right', mono: true, width: 'w-[8rem]' },
  { id: 'actions', header: 'Actions', align: 'right', width: 'w-[8rem]' },
];
const column = Object.fromEntries(columns.map((entry) => [entry.id, entry]));

const groups = toProductionGroupTotals({ groups: [
  { level: 'year', key: '2026', label: '2026', litres: '3761.0', entries: 563 },
  { level: 'month', key: '2026-11', parent: '2026', label: 'November', litres: '598.4', entries: 90 },
  { level: 'day', key: '2026-11-07', parent: '2026-11', label: 'Nov 07, 2026', litres: '37.0', entries: 2 },
] });
const bucket = { year: '2026', month: '2026-11', day: '2026-11-07' };
const rows = [
  { id: 1, cow: 'Joyce', litres: '5.0', bucket },
  { id: 2, cow: 'Sofia', litres: '6.0', bucket },
];
const renderRow = (row) => (
  <tr key={row.id} className="h-11">
    <td className={cellClass(column.session)}>Evening</td>
    <td className={cellClass(column.cow)}>{row.cow}</td>
    <td className={cellClass(column.total)}>{row.litres} L</td>
    <td className={cellClass(column.actions)} />
  </tr>
);
const renderCard = (row) => <article key={row.id}>{row.cow} card</article>;

const renderTable = (props = {}) => render(
  <GroupedDataTable
    columns={columns}
    rows={rows}
    getBucket={(row) => row.bucket}
    groups={groups}
    config={productionGroupConfig}
    renderRow={renderRow}
    renderCard={renderCard}
    loadState="ready"
    rowsLabel="milk records"
    empty="Nothing here"
    {...props}
  />,
);

const desktopTable = () => screen.getByRole('table');

describe('GroupedDataTable', () => {
  it('renders a fixed-layout table with a brand header and fixed column widths', () => {
    renderTable();
    const table = desktopTable();
    expect(table.className).toContain('table-fixed');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Session', 'Cow', 'Litres', 'Actions']);
    expect(table.querySelector('thead tr').className).toContain('bg-brand');
    expect([...table.querySelectorAll('col')].map((col) => col.className)).toEqual(['w-[8rem]', '', 'w-[8rem]', 'w-[8rem]']);
  });

  it('puts each group total under the column it sums, with the count by the label', () => {
    renderTable();
    const november = within(desktopTable()).getByRole('button', { name: /^November, 90 entries/ }).closest('tr');
    const cells = november.querySelectorAll('td');
    // Label spans Session and Cow, then Litres holds the total and Actions stays empty.
    expect(cells[0].getAttribute('colspan')).toBe('2');
    expect(cells[0].textContent).toContain('November');
    expect(cells[0].textContent).toContain('90 entries');
    // The header names the unit, so the total has no "L".
    expect(cells[1].textContent).toBe('598.4');
    expect(cells[2].textContent).toBe('');
  });

  it('can start the table at md, scrolling sideways there, with cards for phones and a neutral header', () => {
    renderTable({ tableFrom: 'md', scroll: true, headerVariant: 'neutral', tableClassName: 'min-w-[1140px]' });
    const table = desktopTable();
    expect(table.className).toContain('min-w-[1140px]');
    expect(table.parentElement.className).toBe('hidden md:block overflow-x-auto');
    expect(table.querySelector('thead tr').className).toContain('bg-ink-100');
    expect(screen.getByText('Joyce card').closest('.md\\:hidden')).toBeTruthy();
  });

  it('opens and closes groups with buttons that report aria-expanded, keeping the same columns', () => {
    renderTable();
    const table = desktopTable();
    const day = within(table).getByRole('button', { name: /^Sat 07 Nov, 2 entries/ });
    // The current month's latest day starts open, so its rows show without repeating the date.
    expect(day.getAttribute('aria-expanded')).toBe('true');
    expect(within(table).getByText('Joyce')).toBeTruthy();
    expect(within(table).queryByText(/07 Nov 2026/)).toBeNull();
    const widths = () => [...table.querySelectorAll('col')].map((col) => col.className).join('|');
    const before = widths();

    fireEvent.click(day);
    expect(day.getAttribute('aria-expanded')).toBe('false');
    expect(within(table).queryByText('Joyce')).toBeNull();
    expect(widths()).toBe(before);

    day.focus();
    fireEvent.click(day);
    expect(day.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the same groups as cards below xl', () => {
    renderTable();
    expect(screen.getByText('Joyce card')).toBeTruthy();
  });

  it('shows the empty message when the result has no rows', () => {
    renderTable({ rows: [] });
    expect(screen.getAllByText('Nothing here')).toHaveLength(2);
  });

  it('shows skeleton rows while loading and a retry message when the rows fail', () => {
    const { unmount } = renderTable({ rows: [], loadState: 'loading' });
    expect(desktopTable().querySelector('tbody').getAttribute('aria-busy')).toBe('true');
    unmount();

    const onRetry = vi.fn();
    renderTable({ rows: [], loadState: 'error', error: new Error('boom'), onRetry });
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
