import { describe, expect, it } from 'vitest';
import { changeDirection, minorUnitsToAmount, neighbourAnchor, toLedgerGroupTotals, toLedgerSummary, toProductionSummary, toTotalsParams } from '../periodTotals';
import { buildGroupTree, collapseSingleChildren, defaultOpenKeys } from '../groupTree';
import { formatDate, formatDayLabel, maskInputDate, parseInputDate, toInputDate } from '../dateFormat';
import { formatDecimal, formatLitres } from '../numberFormat';

describe('period totals adapters', () => {
  it('moves the decimal point of minor units without float maths', () => {
    expect(minorUnitsToAmount('2700500')).toBe(27005);
    expect(minorUnitsToAmount('-80000')).toBe(-800);
    expect(minorUnitsToAmount('5')).toBe(0.05);
    expect(minorUnitsToAmount('12.5')).toBeNull();
    expect(minorUnitsToAmount(null)).toBeNull();
  });

  it('reads the direction from the sign the API sent', () => {
    expect(changeDirection('-5.3')).toBe('down');
    expect(changeDirection('2.0')).toBe('up');
    expect(changeDirection('0.0')).toBe('flat');
    expect(changeDirection(null)).toBeNull();
  });

  it('maps the ledger summary DTO as-is', () => {
    const vm = toLedgerSummary({
      period: 'month', key: '2026-11', label: 'Nov 2026', range: { from: '2026-11-01', to: '2026-11-30' }, has_next: false,
      current: { income: '1740000', expenses: '320000', net: '1420000', unpaid: '150000', count: 29 },
      previous: { key: '2026-10', label: 'Oct 2026' },
      change: { net_abs: '-80000', net_pct: '-5.3' },
      breakdown: [{ key: '2026-W45', label: '3 – 9 Nov', income: '100', expenses: '50', net: '50' }],
    });
    expect(vm.current).toEqual({ income: 17400, expenses: 3200, net: 14200, unpaid: 1500, count: 29 });
    expect(vm.change).toEqual({ abs: -800, pct: '-5.3', direction: 'down', vsLabel: 'Oct 2026' });
    expect(vm.hasNext).toBe(false);
    expect(vm.breakdown[0]).toMatchObject({ key: '2026-W45', net: 0.5 });
  });

  it('keeps production litres as the decimal strings the API sent', () => {
    const vm = toProductionSummary({ current: { litres: '246.0', entries: 36, avg_litres_per_day: '41.0' }, change: { litres_pct: '-81.2' }, previous: { label: 'Oct 2026' } });
    expect(vm.current.litres).toBe('246.0');
    expect(vm.current.entries).toBe(36);
    expect(vm.change.direction).toBe('down');
  });

  it('drops empty filters and steps one day outside the API range', () => {
    expect(toTotalsParams({ type: 'all', search: '', date_from: '2026-11-01', status: undefined })).toEqual({ date_from: '2026-11-01' });
    expect(neighbourAnchor({ from: '2026-11-01', to: '2026-11-30' }, -1)).toBe('2026-10-31');
    expect(neighbourAnchor({ from: '2026-12-01', to: '2026-12-31' }, 1)).toBe('2027-01-01');
    expect(neighbourAnchor(null, 1)).toBeNull();
  });
});

describe('number formatting', () => {
  it('adds separators and keeps the digits the backend sent', () => {
    expect(formatDecimal('1306.4')).toBe('1,306.4');
    expect(formatLitres('246.0')).toBe('246.0 L');
    expect(formatLitres(12.5)).toBe('12.5 L');
    expect(formatLitres(null)).toBe('—');
  });
});

describe('group tree', () => {
  const groups = toLedgerGroupTotals({ groups: [
    { level: 'year', key: '2026', label: '2026', count: 3, income: '300', expenses: '0', net: '300' },
    { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 3, income: '300', expenses: '0', net: '300' },
    { level: 'week', key: '2026-W45', parent: '2026-11', label: '3 – 9 Nov', count: 2, income: '200', expenses: '0', net: '200' },
    { level: 'week', key: '2026-W44', parent: '2026-11', label: '27 Oct – 2 Nov', count: 1, income: '100', expenses: '0', net: '100' },
    { level: 'day', key: '2026-11-06', parent: '2026-W45', label: 'Nov 06, 2026', count: 2, income: '200', expenses: '0', net: '200' },
    { level: 'day', key: '2026-11-01', parent: '2026-W44', label: 'Nov 01, 2026', count: 1, income: '100', expenses: '0', net: '100' },
  ] });
  const bucket = (day, week) => ({ year: '2026', month: '2026-11', week, day });
  const records = [
    { id: 1, bucket: bucket('2026-11-06', '2026-W45') },
    { id: 2, bucket: bucket('2026-11-01', '2026-W44') },
    { id: 3 },
  ];

  it('nests by key and takes header totals from the API, not from rows', () => {
    const tree = buildGroupTree(records, (r) => r.bucket, groups);
    expect(tree.roots.map((n) => n.key)).toEqual(['2026']);
    const month = tree.roots[0].children[0];
    expect(month.children.map((n) => n.key)).toEqual(['2026-W45', '2026-W44']);
    // The API says 2 records for this day although only 1 is loaded.
    expect(tree.nodes.get('2026-11-06').totals.count).toBe(2);
    expect(tree.nodes.get('2026-11-06').records.map((r) => r.id)).toEqual([1]);
    expect(tree.ungrouped.map((r) => r.id)).toEqual([3]);
  });

  it('opens today and its parents by default, else the newest path', () => {
    const tree = buildGroupTree(records, (r) => r.bucket, groups);
    expect([...defaultOpenKeys(tree, '2026-11-06')].sort()).toEqual(['2026', '2026-11', '2026-11-06', '2026-W45']);
    expect([...defaultOpenKeys(tree, '2026-11-20')]).toEqual(['2026', '2026-11', '2026-W45', '2026-11-06']);
  });
});

describe('production log page rules', () => {
  it('shows litres at one decimal place everywhere', async () => {
    const { formatLitres: litres } = await import('../numberFormat');
    expect(['246.0', '8', 4, 3.5, '1306.4'].map((value) => litres(value))).toEqual(['246.0 L', '8.0 L', '4.0 L', '3.5 L', '1,306.4 L']);
  });

  it('lists only the metrics the API sends and never computes the missing ones', async () => {
    const { productionSummaryConfig } = await import('../../components/periods/periodConfigs');
    const base = toProductionSummary({ period: 'week', label: '2 – 8 Nov 2026', range: { from: '2026-11-02', to: '2026-11-08' }, current: { litres: '246.0', entries: 36, avg_litres_per_day: '41.0' } });
    expect(productionSummaryConfig.metrics(base).map((metric) => metric.label)).toEqual(['Total milk', 'Avg per day', 'Entries']);

    const withCalves = toProductionSummary({ period: 'week', current: { litres: '246.0', entries: 36, avg_litres_per_day: '41.0', fed_to_calves_litres: '12.5', available_litres: '233.5' }, change: { entries_pct: '4.1' } });
    const metrics = productionSummaryConfig.metrics(withCalves);
    expect(metrics.map((metric) => [metric.label, metric.value])).toEqual([['Total milk', '246.0 L'], ['Avg per day', '41.0 L'], ['Entries', '36'], ['Fed to calves', '12.5 L'], ['Available', '233.5 L']]);
    expect(metrics[2].change).toMatchObject({ direction: 'up', pct: '4.1' });
  });

  it('describes an empty period with the last entry date only when the API sends it', async () => {
    const { productionSummaryConfig } = await import('../../components/periods/periodConfigs');
    const past = toProductionSummary({ period: 'week', label: '7 – 13 Sep 2026', range: { from: '2026-09-07', to: '2026-09-13' }, current: { litres: '0.0', entries: 0 } });
    expect(productionSummaryConfig.emptyMessage(past)).toBe('No entries in 7 – 13 Sep 2026');
    const withLast = toProductionSummary({ period: 'week', label: '7 – 13 Sep 2026', range: { from: '2026-09-07', to: '2026-09-13' }, current: { litres: '0.0', entries: 0, last_entry_date: '2026-09-23' } });
    expect(productionSummaryConfig.emptyMessage(withLast)).toBe('No entries in 7 – 13 Sep 2026 · last entry 23 Sep 2026');
  });
});

describe('day-first dates', () => {
  it('displays dates as "03 Nov 2026" and day groups as "Tue 03 Nov"', () => {
    expect(formatDate('2026-11-03')).toBe('03 Nov 2026');
    expect(formatDate('2026-09-23')).toBe('23 Sep 2026');
    expect(formatDate('', '—')).toBe('—');
    expect(formatDayLabel('2026-11-03')).toBe('Tue 03 Nov');
    expect(formatDayLabel('2026-11-03', { withYear: true })).toBe('Tue 03 Nov 2026');
  });

  it('reads typed dates as dd/mm/yyyy, never month first', () => {
    expect(parseInputDate('03/11/2026')).toBe('2026-11-03');
    expect(parseInputDate('3/11/2026')).toBe('2026-11-03');
    expect(parseInputDate('11/31/2026')).toBeNull();
    expect(parseInputDate('31/02/2026')).toBeNull();
    expect(toInputDate('2026-11-03')).toBe('03/11/2026');
    expect(maskInputDate('03112026')).toBe('03/11/2026');
    expect(maskInputDate('031')).toBe('03/1');
  });
});

describe('ledger grouping', () => {
  const groups = toLedgerGroupTotals({ groups: [
    { level: 'year', key: '2026', label: '2026', count: 3, income: '300', expenses: '0', net: '300' },
    { level: 'month', key: '2026-11', parent: '2026', label: 'November', count: 2, income: '200', expenses: '0', net: '200' },
    { level: 'month', key: '2026-10', parent: '2026', label: 'October', count: 1, income: '100', expenses: '0', net: '100' },
    { level: 'week', key: '2026-W45', parent: '2026-11', label: '2 – 8 Nov', count: 2, income: '200', expenses: '0', net: '200' },
    { level: 'day', key: '2026-11-03', parent: '2026-W45', label: 'Nov 03, 2026', count: 2, income: '200', expenses: '0', net: '200' },
    { level: 'day', key: '2026-10-28', parent: '2026-W44', label: 'Oct 28, 2026', count: 1, income: '100', expenses: '0', net: '100' },
  ] });
  const bucket = (day) => ({ year: day.slice(0, 4), month: day.slice(0, 7), week: 'ignored', day });
  const records = [{ id: 1, bucket: bucket('2026-11-03') }, { id: 2, bucket: bucket('2026-11-03') }, { id: 3, bucket: bucket('2026-10-28') }];

  it('nests Year → Month → Day and ignores week parents from the API', () => {
    const tree = buildGroupTree(records, (r) => r.bucket, groups, ['year', 'month', 'day']);
    expect(tree.nodes.has('2026-W45')).toBe(false);
    expect(tree.nodes.get('2026-11-03').parent).toBe('2026-11');
    expect(tree.roots[0].children.map((n) => n.key)).toEqual(['2026-11', '2026-10']);
  });

  it('folds a month with one day into one header that keeps both keys', () => {
    const tree = buildGroupTree(records, (r) => r.bucket, groups, ['year', 'month', 'day']);
    const [year] = collapseSingleChildren(tree.roots);
    expect(year.label).toBe('2026');
    expect(year.children.map((n) => [n.label, n.keys])).toEqual([
      ['Tue 03 Nov', ['2026-11', '2026-11-03']],
      ['Wed 28 Oct', ['2026-10', '2026-10-28']],
    ]);
    // Header totals stay the API's (the day's, identical to the month's).
    expect(year.children[0].totals.count).toBe(2);
  });

  it('says there is no previous-period data instead of showing a dash', async () => {
    const { ledgerSummaryConfig } = await import('../../components/periods/periodConfigs');
    const noPrevious = toLedgerSummary({ label: '2026', current: { income: '100', expenses: '0', net: '100', unpaid: '0', count: 1 }, previous: { key: '2025', label: '2025', count: 0 } });
    const change = ledgerSummaryConfig.metrics(noPrevious).find((metric) => metric.key === 'change');
    expect([].concat(change.value.props.children).join('')).toBe('No 2025 data');
    const labels = ledgerSummaryConfig.secondary(noPrevious, { owed: 370.3, credit: 6.36 }).map((item) => item.label);
    expect(labels).toEqual(['Unpaid in 2026', 'Owed to you (all time)', 'Customer credit (now)', 'Records in 2026']);
  });
});
