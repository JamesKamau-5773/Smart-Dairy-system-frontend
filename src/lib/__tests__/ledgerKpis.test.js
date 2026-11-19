import { describe, expect, it } from 'vitest';
import { toLedgerKpis } from '../ledgerKpis';
import { formatPercent } from '../numberFormat';

describe('toLedgerKpis', () => {
  it('reads every figure from the list response summary', () => {
    expect(toLedgerKpis({
      recognized_sales: 65270, posted_costs: 79600, net_profit: -14330,
      customer_credit: 13320, outstanding_receivables: 55390, profit_margin_pct: '-22.0',
    })).toEqual({
      totalSales: 65270, postedCosts: 79600, netProfit: -14330,
      customerCredit: 13320, unpaidMoney: 55390, profitMarginPct: '-22.0',
    });
  });

  it('leaves a figure the API didn’t send as null, and never divides', () => {
    const kpis = toLedgerKpis({ recognized_sales: 100, net_profit: 50 });
    expect(kpis.profitMarginPct).toBeNull();
    expect(kpis.customerCredit).toBeNull();
    expect(toLedgerKpis({ profit_margin_pct: null }).profitMarginPct).toBeNull();
    expect(toLedgerKpis({ profit_margin_pct: 'n/a' }).profitMarginPct).toBeNull();
  });

  it('is null when the response had no summary', () => {
    expect(toLedgerKpis(undefined)).toBeNull();
  });
});

describe('formatPercent', () => {
  it('keeps the API’s digits with a true minus, and "—" when there is none', () => {
    expect(formatPercent('68.7')).toBe('68.7%');
    expect(formatPercent('-12.5')).toBe('−12.5%');
    expect(formatPercent(null)).toBe('—');
  });
});
