import Money, { formatMoneyText } from '../ui/Money';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { formatDateRange } from '../../lib/dateFormat';
import { TABLE_GROUP_LEVELS } from '../../lib/periodTotals';
import { productionCopy } from '../../i18n/production';
import { commonCopy } from '../../i18n/common';
import { financeCopy } from '../../i18n/finance';

const ledgerWords = financeCopy.ledgerPeriods;

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
    { key: 'in', label: ledgerWords.moneyIn, value: moneyOrDash(current.income, { size: 'stat-value' }) },
    { key: 'out', label: ledgerWords.moneyOut, value: moneyOrDash(current.expenses, { size: 'stat-value' }) },
    { key: 'net', label: ledgerWords.net, value: moneyOrDash(current.net, { size: 'stat-value', tone: 'net' }) },
    { key: 'unpaid', label: ledgerWords.unpaid, value: moneyOrDash(current.unpaid, { size: 'stat-value' }) },
  ],
};

const recordsText = (count) => (count == null ? '—' : ledgerWords.records(count, formatCount(count)));

export const ledgerGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  get noun() { return financeCopy.ledger.noun; },
  // Desktop table: the group's net (from the API) in the Amount column, signed like the rows:
  // a negative in the negative colour, a positive plain. The header names the currency.
  columnTotals: {
    amount: (totals) => moneyOrDash(totals.net, { tone: 'signed', showCurrency: false, className: 'text-body-strong' }),
  },
  labelMeta: (totals) => <span className="shrink-0 text-meta text-ink-muted">· {recordsText(totals.count)}</span>,
  // Phones have no column header, so the net keeps its currency.
  renderSummary: (totals) => moneyOrDash(totals.net, { tone: 'signed', className: 'text-body-strong' }),
  describeSummary: (totals) => ledgerWords.describeTotals(signedMoneyText(totals.net), formatMoneyText(totals.income), formatMoneyText(totals.expenses)),
};

const entriesText = (count) => (count == null ? '—' : productionCopy.group.entries(count, formatCount(count)));
const litresValue = (value) => <span className="tabular-nums">{formatLitres(value)}</span>;

export const productionSummaryConfig = {
  // TODO(BR-022): "Available" (`available_litres`) is left out, not shown as "—", until the
  // backend confirms the field; add it back here as a third item when it does.
  items: ({ current }) => [
    { key: 'litres', label: productionCopy.summary.totalMilk, value: litresValue(current.litres) },
    { key: 'avg', label: productionCopy.summary.avgPerDay, value: litresValue(current.avgLitresPerDay) },
  ],
};

export const productionGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  get noun() { return productionCopy.group.noun; },
  // Desktop table: litres under the Litres column (the header names the unit), the entry
  // count next to the label.
  columnTotals: {
    litres: (totals) => <span className="text-body-strong tabular-nums text-ink">{formatLitres(totals.litres, { unit: false })}</span>,
  },
  labelMeta: (totals) => <span className="shrink-0 truncate text-meta text-ink-muted">· {entriesText(totals.entries)}</span>,
  renderSummary: (totals) => (
    <span className="flex flex-col items-end">
      <span className="text-body-strong tabular-nums text-ink">{formatLitres(totals.litres)}</span>
      <span className="whitespace-nowrap text-meta text-ink-muted">{entriesText(totals.entries)}</span>
    </span>
  ),
  describeSummary: (totals) => productionCopy.group.describe(formatLitres(totals.litres)),
};
