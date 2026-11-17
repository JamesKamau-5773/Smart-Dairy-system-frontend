import Money, { formatMoneyText } from '../ui/Money';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { formatDateRange } from '../../lib/dateFormat';
import { TABLE_GROUP_LEVELS } from '../../lib/periodTotals';
import { productionCopy } from '../../i18n/production';
import { commonCopy } from '../../i18n/common';

// Per-page configuration for SummaryStrip and GroupedDataTable. Adding a page means adding a
// config here, not changing the components. Every figure is read from the API view model;
// nothing is computed.

const moneyOrDash = (amount, props = {}) => (amount == null ? '—' : <Money amount={amount} {...props} />);
const signedMoneyText = (amount) => (amount == null ? '—' : formatMoneyText(amount));
/** What the strip covers: the year ("2026") for the default range, else the chosen dates. */
export const summaryScope = (range, { isDefault = false } = {}) => (
  isDefault && range?.from ? range.from.slice(0, 4) : formatDateRange(range?.from, range?.to)
);

/** Why the strip has no figures for this range, or null when it can have them. */
export const summaryNotice = (summaryState) => (summaryState.unsupported ? commonCopy.summary.acrossYears : null);

/** True when the API says the result has no records (never inferred from missing figures). */
export const summaryIsEmpty = (summary) => summary?.current?.count === 0;

export const ledgerSummaryConfig = {
  items: ({ current }) => [
    { key: 'in', label: 'Money in', value: moneyOrDash(current.income, { size: 'md' }) },
    { key: 'out', label: 'Money out', value: moneyOrDash(current.expenses, { size: 'md' }) },
    { key: 'net', label: 'Net', value: moneyOrDash(current.net, { size: 'md', tone: 'net' }) },
    { key: 'unpaid', label: 'Unpaid', value: moneyOrDash(current.unpaid, { size: 'md' }) },
  ],
};

const recordsText = (count) => (count == null ? '—' : `${formatCount(count)} ${count === 1 ? 'record' : 'records'}`);

export const ledgerGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  noun: ['record', 'records'],
  // Desktop table: the group's net (from the API) in the Amount column, signed like the rows:
  // a negative in the negative colour, a positive plain. The header names the currency.
  columnTotals: {
    amount: (totals) => moneyOrDash(totals.net, { size: 'sm', tone: 'signed', showCurrency: false, className: 'font-semibold' }),
  },
  labelMeta: (totals) => <span className="shrink-0 text-xs font-normal text-ink-muted">· {recordsText(totals.count)}</span>,
  // Phones have no column header, so the net keeps its currency.
  renderSummary: (totals) => moneyOrDash(totals.net, { size: 'sm', tone: 'signed', className: 'font-semibold' }),
  describeSummary: (totals) => `net ${signedMoneyText(totals.net)}, in ${formatMoneyText(totals.income)}, out ${formatMoneyText(totals.expenses)}`,
};

const entriesText = (count) => (count == null ? '—' : productionCopy.group.entries(count, formatCount(count)));
// "563 entries": the count in mono, the word in plain text. "—" when the API sent no count.
const entriesMeta = (count) => (
  <span className="ml-2 shrink-0 truncate font-mono text-[11px] font-semibold uppercase tabular-nums tracking-wider text-ink-400">
    {count == null ? '—' : formatCount(count)}{' '}
    <span className="font-sans font-normal lowercase">{productionCopy.group.entriesWord(count ?? 0)}</span>
  </span>
);

export const productionGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  get noun() { return productionCopy.group.noun; },
  // Grey-tinted group rows with brand labels; deeper levels are lighter and further in.
  levelStyles: {
    year: 'border-t-2 border-ink-200 bg-ink-50 text-sm font-semibold text-brand',
    month: 'bg-ink-50/50 text-sm font-semibold text-brand',
    day: 'bg-ink-50/30 text-sm font-semibold text-brand',
  },
  levelIndent: { year: 'pl-4', month: 'pl-8', day: 'pl-12' },
  chevronClassName: 'text-brand',
  cellClassName: '!px-4',
  // Desktop table: litres under the Total (L) column (the header names the unit), the entry
  // count next to the label.
  columnTotals: {
    total: (totals) => <span className="whitespace-nowrap font-mono text-sm font-bold tabular-nums text-brand">{formatLitres(totals.litres, { unit: false })}</span>,
  },
  labelMeta: (totals) => entriesMeta(totals.entries),
  renderSummary: (totals) => (
    <span className="flex flex-col items-end">
      <span className="font-mono text-sm font-semibold tabular-nums text-ink">{formatLitres(totals.litres)}</span>
      <span className="whitespace-nowrap text-[11px] font-normal text-ink-muted">{entriesText(totals.entries)}</span>
    </span>
  ),
  describeSummary: (totals) => productionCopy.group.describe(formatLitres(totals.litres)),
};
