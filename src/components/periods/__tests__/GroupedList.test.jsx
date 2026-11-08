import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import GroupedList from '../GroupedList';
import { ledgerGroupConfig, productionGroupConfig } from '../periodConfigs';
import { toLedgerGroupTotals, toProductionGroupTotals } from '../../../lib/periodTotals';

afterEach(cleanup);

// The API may still send week groups; the ledger shows Year → Month → Day only.
const groups = toLedgerGroupTotals({ groups: [
  { level: 'year', key: '2025', label: '2025', count: 1, income: '0', expenses: '5000', net: '-5000' },
  { level: 'month', key: '2025-12', parent: '2025', label: 'December', count: 1, income: '0', expenses: '5000', net: '-5000' },
  { level: 'week', key: '2025-W52', parent: '2025-12', label: '22 – 28 Dec', count: 1, income: '0', expenses: '5000', net: '-5000' },
  { level: 'day', key: '2025-12-24', parent: '2025-W52', label: 'Dec 24, 2025', count: 1, income: '0', expenses: '5000', net: '-5000' },
] });
const records = [{ id: 'a', name: 'Vet visit', bucket: { year: '2025', month: '2025-12', week: '2025-W52', day: '2025-12-24' } }];
const renderRecord = (r) => <p key={r.id}>{r.name}</p>;

describe('GroupedList', () => {
  it('folds single-child groups into one header so the same totals are never stacked', () => {
    render(<GroupedList records={records} getBucket={(r) => r.bucket} groups={groups} config={ledgerGroupConfig} renderRecord={renderRecord} />);

    const headers = screen.getAllByRole('button', { expanded: true });
    expect(headers).toHaveLength(1);
    const header = screen.getByRole('button', { name: /^Wed 24 Dec 2025, 1 record, net −KES 50.00/ });
    expect(header.getAttribute('data-group-keys')).toBe('2025 2025-12 2025-12-24');
    expect(screen.getByText('Vet visit')).toBeTruthy();

    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Vet visit')).toBeNull();
  });

  it('shows — when group totals are unavailable instead of adding up rows', () => {
    render(<GroupedList records={records} getBucket={(r) => r.bucket} groups={null} groupsUnavailable config={ledgerGroupConfig} renderRecord={renderRecord} />);
    expect(screen.getByText('Group totals couldn’t load, so headers show —.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Wed 24 Dec 2025, count not available, totals not available/ })).toBeTruthy();
  });

  it('puts the in and out totals in the Money in and Money out columns of the table', () => {
    const columns = ['date', 'party', 'category', 'description', 'ref', 'money_in', 'money_out', 'status', 'actions'].map((id) => ({ id, header: id, align: id.startsWith('money') ? 'right' : 'left' }));
    const twoDays = toLedgerGroupTotals({ groups: [
      { level: 'year', key: '2026', label: '2026', count: 3, income: '480000', expenses: '7093925', net: '-6613925' },
      { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 2, income: '0', expenses: '7093925', net: '-7093925' },
      { level: 'month', key: '2026-10', parent: '2026', label: 'October', count: 1, income: '480000', expenses: '0', net: '480000' },
    ] });
    const rows = [
      { id: 1, bucket: { year: '2026', month: '2026-11', day: '2026-11-03' } },
      { id: 3, bucket: { year: '2026', month: '2026-11', day: '2026-11-01' } },
      { id: 2, bucket: { year: '2026', month: '2026-10', day: '2026-10-28' } },
    ];
    const { container } = render(
      <table><tbody>
        <GroupedList records={rows} getBucket={(r) => r.bucket} groups={twoDays} config={ledgerGroupConfig} variant="table" columns={columns} renderRecord={(r) => <tr key={r.id}><td>{r.id}</td></tr>} />
      </tbody></table>,
    );

    const november = screen.getByRole('button', { name: /^November, 2 records/ }).closest('tr');
    const cells = november.querySelectorAll('td');
    // Label spans Date…Ref (5 columns), then Money in, Money out, Status, ⋮.
    expect(cells[0].getAttribute('colspan')).toBe('5');
    expect(cells).toHaveLength(5);
    expect(cells[1].textContent).toBe('KES0.00');
    expect(cells[2].textContent).toBe('KES70,939.25');
    expect(cells[3].textContent).toBe('');
    expect(cells[4].textContent).toBe('');
    // Net sits at the end of the label, with a true minus sign.
    expect(cells[0].textContent).toContain('· 2 records');
    expect(cells[0].textContent).toMatch(/Net −minus KES70,939\.25/);
    expect(container.querySelector('[data-group-keys~="2026-11"]')).toBeTruthy();
  });

  it('keeps every level on the Production Log, weeks included', () => {
    const production = toProductionGroupTotals({ groups: [
      { level: 'year', key: '2026', label: '2026', litres: '246.0', entries: 2, avg_litres_per_day: '41.0' },
      { level: 'month', key: '2026-11', parent: '2026', label: 'November', litres: '246.0', entries: 2, avg_litres_per_day: '41.0' },
      { level: 'week', key: '2026-W45', parent: '2026-11', label: '2 – 8 Nov', litres: '246.0', entries: 2, avg_litres_per_day: '41.0' },
      { level: 'day', key: '2026-11-06', parent: '2026-W45', label: 'Nov 06, 2026', litres: '23.5', entries: 2, avg_litres_per_day: '23.5' },
    ] });
    const milk = [{ id: 1, name: 'Neema', bucket: { year: '2026', month: '2026-11', week: '2026-W45', day: '2026-11-06' } }];
    render(<GroupedList records={milk} getBucket={(r) => r.bucket} groups={production} config={productionGroupConfig} renderRecord={renderRecord} />);
    expect(screen.getByRole('button', { name: /^2026, 2 entries/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^November, 2 entries/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^2 – 8 Nov, 2 entries/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Fri 06 Nov, 2 entries/ })).toBeTruthy();
  });
});
