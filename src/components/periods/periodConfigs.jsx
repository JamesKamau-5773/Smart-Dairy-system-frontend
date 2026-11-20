import Money, { formatMoneyText } from '../ui/Money';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { formatDate, formatDateRange } from '../../lib/dateFormat';
import { groupLabel } from '../../lib/groupTree';
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
/**
 * What the figures cover: the year ("2026") for the default range, else the chosen dates
 * (`short`: "01 Oct – 15 Oct 2026").
 */
export const summaryScope = (range, { isDefault = false, short = false } = {}) => (
  isDefault && range?.from ? range.from.slice(0, 4) : formatDateRange(range?.from, range?.to, { short })
);

/** Why the strip has no figures for this range, or null when it can have them. */
export const summaryNotice = (summaryState) => (summaryState.unsupported ? commonCopy.summary.acrossYears : null);

/** True when the API says the result has no records (never inferred from missing figures). */
export const summaryIsEmpty = (summary) => summary?.current?.count === 0;

const recordsText = (count) => (count == null ? '—' : ledgerWords.records(count, formatCount(count)));

// Ledger groups: Year → Month → Day, told apart by indent and weight; only the year row is
// tinted. Day groups read "18 Nov 2026", like every other Ledger date.
export const ledgerGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  get noun() { return financeCopy.ledger.noun; },
  groupLabel: (node) => (node.level === 'day' ? formatDate(node.key, groupLabel(node)) : groupLabel(node)),
  levelStyles: {
    year: 'bg-brand-50 text-ink text-body-strong',
    month: 'bg-card text-ink text-body-strong',
    day: 'bg-card text-ink text-body',
  },
  levelType: { year: 'text-body-strong', month: 'text-body-strong', day: 'text-body' },
  levelIndent: { year: 'pl-2 sm:pl-4', month: 'pl-5 sm:pl-8', day: 'pl-8 sm:pl-12' },
  chevronClassName: 'text-ink-muted',
  // The group's net (from the API) under the Amount column, signed and with its currency
  // like the rows: a negative in the negative colour, a positive plain.
  columnTotals: {
    amount: (totals) => moneyOrDash(totals.net, { tone: 'signed', cents: 'plain', className: 'text-body-strong' }),
  },
  labelMeta: (totals) => <span className="shrink-0 text-meta tabular-nums text-ink-muted">· {recordsText(totals.count)}</span>,
  renderSummary: (totals) => moneyOrDash(totals.net, { tone: 'signed', cents: 'plain', className: 'text-body-strong' }),
  describeSummary: (totals) => ledgerWords.describeTotals(signedMoneyText(totals.net), formatMoneyText(totals.income), formatMoneyText(totals.expenses)),
};

const entriesText = (count) => (count == null ? '—' : productionCopy.group.entries(count, formatCount(count)));
// "563 entries" by the group label. "—" when the API sent no count.
const entriesMeta = (count) => (
  <span className="ml-2 shrink-0 truncate text-meta tabular-nums text-ink-400">
    {count == null ? '—' : formatCount(count)} {productionCopy.group.entriesWord(count ?? 0)}
  </span>
);

export const productionGroupConfig = {
  levels: TABLE_GROUP_LEVELS,
  get noun() { return productionCopy.group.noun; },
  // Grey-tinted group rows with brand labels; deeper levels are lighter and further in.
  levelStyles: {
    year: 'border-t-2 border-ink-200 bg-ink-50 text-body-strong text-brand',
    month: 'bg-ink-50/50 text-body-strong text-brand',
    day: 'bg-ink-50/30 text-body-strong text-brand',
  },
  // Set again on the toggle button, which doesn't inherit the row's type role.
  levelType: { year: 'text-body-strong', month: 'text-body-strong', day: 'text-body-strong' },
  levelIndent: { year: 'pl-4', month: 'pl-8', day: 'pl-12' },
  chevronClassName: 'text-brand',
  cellClassName: '!px-4',
  // Desktop table: litres under the Total (L) column (the header names the unit), the entry
  // count next to the label.
  columnTotals: {
    total: (totals) => <span className="whitespace-nowrap text-body-strong tabular-nums text-brand">{formatLitres(totals.litres, { unit: false })}</span>,
  },
  labelMeta: (totals) => entriesMeta(totals.entries),
  renderSummary: (totals) => (
    <span className="flex flex-col items-end">
      <span className="text-body-strong tabular-nums text-ink">{formatLitres(totals.litres)}</span>
      <span className="whitespace-nowrap text-meta text-ink-muted">{entriesText(totals.entries)}</span>
    </span>
  ),
  describeSummary: (totals) => productionCopy.group.describe(formatLitres(totals.litres)),
};
