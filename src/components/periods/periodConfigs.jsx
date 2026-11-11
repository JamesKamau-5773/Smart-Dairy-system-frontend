import Money, { formatMoneyText } from '../ui/Money';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { formatDate, formatDateRange } from '../../lib/dateFormat';
import { todayLocalIso } from '../../lib/localDate';
import { previousHasData } from '../../lib/periodTotals';
import { ChangeValue, CompactChange } from './ChangeIndicator';
import { commonCopy } from '../../i18n/common';
import { productionCopy } from '../../i18n/production';

// Per-page configuration for PeriodSummary and GroupedList. Adding a page (e.g. Milk
// Usage) means adding a config here, not changing the components. Every figure is read
// from the API view model; nothing is computed.

const moneyOrDash = (amount, props = {}) => (amount == null ? '—' : <Money amount={amount} {...props} />);
const signedMoneyText = (amount) => (amount == null ? '—' : formatMoneyText(amount));

/** What the period is called in labels: "2026", "Nov 2026", or the custom range. */
export const scopeLabel = (summary) => summary?.label ?? formatDateRange(summary?.range?.from, summary?.range?.to) ?? 'this period';

function ledgerChange(summary) {
  const previousLabel = summary.previous?.label ?? null;
  const vsText = previousLabel ? `vs ${previousLabel}` : 'vs previous period';
  const noData = <span className="text-sm font-medium text-ink-muted">No {previousLabel ?? 'previous-period'} data</span>;
  if (previousHasData(summary) === false || !summary.previous) return { value: noData, sub: '' };
  const value = <ChangeValue change={summary.change} vsText={vsText} />;
  // The API sent previous data but no percentage (e.g. a zero net to compare with).
  if (!summary.change?.pct) return { value: <span className="text-sm font-medium text-ink-muted">Not comparable</span>, sub: vsText };
  return { value, sub: vsText };
}

export const ledgerSummaryConfig = {
  metrics: (summary) => {
    const { current } = summary;
    const change = ledgerChange(summary);
    return [
      { key: 'in', label: 'Money in', value: moneyOrDash(current.income, { size: 'lg' }) },
      { key: 'out', label: 'Money out', value: moneyOrDash(current.expenses, { size: 'lg' }) },
      { key: 'net', label: 'Net', value: moneyOrDash(current.net, { size: 'lg', tone: 'net' }) },
      { key: 'change', label: 'Change in net', value: change.value, sub: change.sub },
    ];
  },
  // Each figure states its own scope, so the two unpaid figures can't be confused.
  secondary: (summary, balances) => [
    { key: 'unpaid', label: `Unpaid in ${scopeLabel(summary)}`, value: moneyOrDash(summary.current.unpaid, { size: 'sm' }) },
    { key: 'owed', label: 'Owed to you (all time)', value: moneyOrDash(balances?.owed, { size: 'sm' }) },
    { key: 'credit', label: 'Customer credit (now)', value: moneyOrDash(balances?.credit, { size: 'sm' }) },
    { key: 'records', label: `Records in ${scopeLabel(summary)}`, value: formatCount(summary.current.count) },
  ],
  emptyMessage: (summary) => `No records in ${scopeLabel(summary)}.`,
  chart: {
    series: [
      { id: 'income', label: 'Money in', barClass: 'bg-brand' },
      { id: 'expenses', label: 'Money out', barClass: 'bg-ink-500' },
    ],
    describe: (item) => `${item.label} · In ${formatMoneyText(item.income)} · Out ${formatMoneyText(item.expenses)}`,
    // `count` is requested from the backend; until then a sub-period with nothing in or out is empty.
    isEmpty: (item) => (item.count !== undefined && item.count !== null ? item.count === 0 : !item.income && !item.expenses),
    axisLabel: (item) => item.shortLabel ?? item.label,
  },
};

const recordsText = (count) => `${formatCount(count)} ${count === 1 ? 'record' : 'records'}`;

export const ledgerGroupConfig = {
  // Week totals live in the period summary (Week view), not in the list.
  levels: ['year', 'month', 'day'],
  collapseSingleChild: true,
  noun: ['record', 'records'],
  columnTotals: {
    money_in: (totals) => moneyOrDash(totals.income, { size: 'sm', className: 'font-semibold text-ink' }),
    money_out: (totals) => moneyOrDash(totals.expenses, { size: 'sm', className: 'font-semibold text-ink' }),
  },
  labelMeta: (totals) => (
    <>
      <span className="shrink-0 text-xs font-normal text-ink-muted">· {recordsText(totals.count)}</span>
      <span className="ml-auto shrink-0 pl-3 text-xs font-medium text-ink-muted">Net {moneyOrDash(totals.net, { size: 'sm', tone: 'net', className: 'font-semibold' })}</span>
    </>
  ),
  // Phones: net as the main figure, in and out muted underneath.
  renderSummary: (totals) => (
    <span className="flex flex-col items-end">
      {moneyOrDash(totals.net, { size: 'sm', tone: 'net', className: 'font-semibold' })}
      <span className="flex flex-wrap justify-end gap-x-1 text-[11px] font-normal text-ink-muted">
        <span className="whitespace-nowrap">In {moneyOrDash(totals.income, { size: 'xs' })}</span>
        <span aria-hidden="true">·</span>
        <span className="whitespace-nowrap">Out {moneyOrDash(totals.expenses, { size: 'xs' })}</span>
      </span>
    </span>
  ),
  describeSummary: (totals) => `net ${signedMoneyText(totals.net)}, in ${formatMoneyText(totals.income)}, out ${formatMoneyText(totals.expenses)}`,
};

const entriesText = (count) => productionCopy.group.entries(count, formatCount(count));
const periodName = (period) => commonCopy.period.names[period] ?? commonCopy.period.names.custom;

export const productionSummaryConfig = {
  // Every value comes from the API. A metric whose field the API doesn't send yet is left
  // out (see the backend requests in docs/contracts/period-totals.md), never computed.
  metrics: (summary) => {
    const { current, change, metricChanges = {} } = summary;
    const vsText = commonCopy.period.vsPrior(periodName(summary.period));
    const copy = productionCopy.summary;
    const metric = (key, label, value, metricChange) => ({
      key, label, value, change: metricChange, mono: true, sub: <CompactChange change={metricChange} vsText={vsText} />,
    });
    return [
      metric('litres', copy.totalMilk, formatLitres(current.litres), change),
      metric('avg', copy.avgPerDay, formatLitres(current.avgLitresPerDay), metricChanges.avgLitresPerDay),
      metric('entries', copy.entries, formatCount(current.entries), metricChanges.entries),
      current.fedToCalvesLitres !== undefined && metric('calves', copy.fedToCalves, formatLitres(current.fedToCalvesLitres), metricChanges.fedToCalvesLitres),
      current.availableLitres !== undefined && metric('available', copy.available, formatLitres(current.availableLitres), metricChanges.availableLitres),
    ].filter(Boolean);
  },
  emptyMessage: (summary) => {
    const today = todayLocalIso();
    const isCurrent = summary.range && summary.range.from <= today && today <= summary.range.to;
    const copy = productionCopy.summary;
    const what = isCurrent ? copy.emptyCurrent(periodName(summary.period)) : copy.emptyIn(summary.label);
    const lastEntry = summary.current.lastEntryDate ? copy.lastEntry(formatDate(summary.current.lastEntryDate)) : '';
    return `${what}${lastEntry}`;
  },
};

export const productionGroupConfig = {
  levels: ['year', 'month', 'week', 'day'],
  collapseSingleChild: false,
  get noun() { return productionCopy.group.noun; },
  // Desktop table: litres under the LITRES column, count and rate in the label.
  columnTotals: {
    litres: (totals) => <span className="font-mono text-sm font-semibold tabular-nums text-ink">{formatLitres(totals.litres)}</span>,
  },
  labelMeta: (totals) => (
    <span className="shrink-0 truncate text-xs font-normal text-ink-muted">
      · {entriesText(totals.entries)} · {formatLitres(totals.avgLitresPerDay, { unit: false })} {productionCopy.group.perDayUnit}
    </span>
  ),
  renderSummary: (totals) => (
    <span className="flex flex-col items-end">
      <span className="font-mono text-sm font-semibold tabular-nums text-ink">{formatLitres(totals.litres)}</span>
      <span className="whitespace-nowrap font-mono text-[11px] font-normal tabular-nums text-ink-muted">
        {entriesText(totals.entries)} · {formatLitres(totals.avgLitresPerDay, { unit: false })} {productionCopy.group.perDayUnit}
      </span>
    </span>
  ),
  describeSummary: (totals) => productionCopy.group.describe(formatLitres(totals.litres), formatLitres(totals.avgLitresPerDay)),
};
