import Money from '../../ui/Money';
import { formatPercent } from '../../../lib/numberFormat';
import { financeCopy } from '../../../i18n/finance';

// What each Ledger KPI card shows. A new card is a new entry here; KpiGroup and KpiCard don't
// change. Every value comes from the API (lib/ledgerKpis.js); "—" when it wasn't sent.

const money = (amount) => (amount == null ? '—' : <Money amount={amount} size="stat-value" cents="plain" />);
// Negatives get a true minus and the negative-money colour (the theme's danger-900); positives stay plain.
const signedMoney = (amount) => (amount == null ? '—' : <Money amount={amount} size="stat-value" cents="plain" tone="signed" />);

const kpi = (key, render, { info = false } = {}) => ({
  key,
  get label() { return financeCopy.ledger.kpis[key]; },
  get info() { return info ? financeCopy.ledger.kpis[`${key}Info`] : undefined; },
  render,
});

/** "View full report": the Farm Reporting Dashboard on the Ledger's dates. */
export const ledgerReportRoute = (range) => `/operations/reports?period=custom&start_date=${range.from}&end_date=${range.to}`;

export const LEDGER_KPI_ROWS = [
  {
    variant: 'default',
    items: [
      kpi('totalSales', (values) => money(values.totalSales), { info: true }),
      kpi('postedCosts', (values) => money(values.postedCosts)),
      kpi('netProfit', (values) => signedMoney(values.netProfit)),
    ],
  },
  {
    variant: 'emphasis',
    items: [
      kpi('customerCredit', (values) => money(values.customerCredit), { info: true }),
      kpi('unpaidMoney', (values) => money(values.unpaidMoney), { info: true }),
      // From the API (BR-030): never divided here. "—" when sales are 0 or it wasn't sent.
      kpi('profitMargin', (values) => formatPercent(values.profitMarginPct)),
    ],
  },
];
