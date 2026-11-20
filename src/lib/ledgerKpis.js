// The Ledger's KPI figures, read from the `summary` block of GET /api/finance/ledger (the same
// request as the rows). Mapping only: nothing is added up or divided here. A figure the API
// didn't send is null, and the card shows "—".
//
// Scope, as the backend computes it:
//   totalSales, postedCosts, netProfit, profitMarginPct: the records the filters match
//     (dates, type, category and the customer or buyer search), like the table.
//   customerCredit, unpaidMoney: today's balances. Only the customer or buyer search narrows them.

const amountOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// A 1-dp decimal string such as "68.7" or "-12.5" (BR-030); null when absent or unreadable.
const percentOrNull = (value) => (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim()) ? value.trim() : null);

/** API `summary` → KPI view model; null when the response had no summary. */
export function toLedgerKpis(summary) {
  if (!summary || typeof summary !== 'object') return null;
  return {
    totalSales: amountOrNull(summary.recognized_sales),
    postedCosts: amountOrNull(summary.posted_costs),
    netProfit: amountOrNull(summary.net_profit),
    customerCredit: amountOrNull(summary.customer_credit),
    unpaidMoney: amountOrNull(summary.outstanding_receivables),
    profitMarginPct: percentOrNull(summary.profit_margin_pct),
  };
}
