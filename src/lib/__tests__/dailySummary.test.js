import { describe, expect, it } from 'vitest';
import { formatCount, formatKES, formatLitres } from '../numberFormat';
import { readDailySummary } from '../dashboardUtils';
import { MILK_CARDS, MONEY_CARDS, statCardProps } from '../../components/dashboard/dailySummaryCards';
import { dashboardCopy } from '../../i18n/dashboard.en';

const copy = dashboardCopy.summary;

describe('formatKES', () => {
  it('shows whole shillings with separators', () => {
    expect(formatKES(12400)).toBe('KES 12,400');
    expect(formatKES('1306.4')).toBe('KES 1,306');
    expect(formatKES(0)).toBe('KES 0');
  });

  it('puts a true minus before the currency', () => {
    expect(formatKES(-800)).toBe('−KES 800');
    expect(formatKES(-0.2)).toBe('KES 0');
  });

  it('takes decimals and the backend’s currency', () => {
    expect(formatKES(18.5, { fractionDigits: 2 })).toBe('KES 18.50');
    expect(formatKES(18.5, { fractionDigits: 2, currency: 'UGX' })).toBe('UGX 18.50');
  });

  it('shows "—" when unknown', () => {
    expect(formatKES(null)).toBe('—');
    expect(formatKES(undefined)).toBe('—');
    expect(formatKES('')).toBe('—');
    expect(formatKES('abc')).toBe('—');
  });
});

describe('formatLitres and formatCount on the dashboard', () => {
  it('litres at 1 dp, without the unit (the card shows it)', () => {
    expect(formatLitres(84.5, { unit: false })).toBe('84.5');
    expect(formatLitres(1306, { unit: false })).toBe('1,306.0');
    expect(formatLitres(null, { unit: false })).toBe('—');
  });

  it('counts are whole numbers', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(null)).toBe('—');
  });
});

describe('readDailySummary', () => {
  const summary = {
    production_total_liters: '84.5',
    saleable_liters: 80,
    total_sold_liters: 60,
    remaining_milk_liters: 20,
    cows_milked: 7,
    avg_per_cow: 12.1,
    profit_per_liter: 18,
    revenue_total_kes: 5200,
    feed_cost_total_kes: 1800,
    net_margin_kes: 3400,
    revenue_breakdown: { report_sales_revenue_kes: 5000 },
    currency: 'KES',
  };

  it('reads each figure from the backend’s fields', () => {
    expect(readDailySummary(summary)).toEqual({
      profit: 3400,
      revenue: 5200,
      feedCost: 1800,
      reportRevenue: 5000,
      totalLiters: 84.5,
      saleableLiters: 80,
      soldLiters: 60,
      remainingLiters: 20,
      cowsMilked: 7,
      averagePerCow: 12.1,
      profitPerLiter: 18,
      currency: 'KES',
      hasRecordsToday: true,
    });
  });

  it('leaves a figure the backend did not send as null (never 0)', () => {
    const figures = readDailySummary({ production_total_liters: 10 });
    expect(figures.saleableLiters).toBeNull();
    expect(figures.soldLiters).toBeNull();
    expect(figures.remainingLiters).toBeNull();
    expect(figures.reportRevenue).toBeNull();
    expect(readDailySummary(null).totalLiters).toBeNull();
  });

  it('keeps a negative milk remaining as the backend sent it', () => {
    expect(readDailySummary({ remaining_milk_liters: -4.2 }).remainingLiters).toBe(-4.2);
  });

  it('knows there are no records today only when the backend says no cows were milked', () => {
    expect(readDailySummary({ cows_milked: 0 }).hasRecordsToday).toBe(false);
    expect(readDailySummary({ cows_milked: 3 }).hasRecordsToday).toBe(true);
    expect(readDailySummary({ production_total_liters: 0 }).hasRecordsToday).toBeNull();
    expect(readDailySummary(null).hasRecordsToday).toBeNull();
  });
});

describe('dashboard cards', () => {
  it('orders money: Daily profit first, Today’s feed cost last', () => {
    expect(MONEY_CARDS.map((card) => card.id)).toEqual(['profit', 'revenue', 'feedCost']);
    expect(MONEY_CARDS.filter((card) => card.variant === 'primary').map((card) => card.id)).toEqual(['profit']);
  });

  it('orders milk: Total milk first, Milk remaining last, seven cards', () => {
    expect(MILK_CARDS.map((card) => card.id)).toEqual([
      'totalMilk', 'saleableMilk', 'milkSold', 'cowsMilked', 'averagePerCow', 'profitPerLiter', 'milkRemaining',
    ]);
  });

  const byId = (cards, id) => cards.find((card) => card.id === id);

  it('shows a negative profit in the danger tone', () => {
    const figures = readDailySummary({ net_margin_kes: -650, cows_milked: 4 });
    expect(statCardProps(byId(MONEY_CARDS, 'profit'), figures, { copy })).toMatchObject({ value: '−KES 650', tone: 'danger' });
    expect(statCardProps(byId(MONEY_CARDS, 'feedCost'), figures, { copy }).tone).toBe('default');
  });

  it('shows the backend’s zeros as zeros, and null (a muted "—") only when a figure is missing', () => {
    const zeros = readDailySummary({ net_margin_kes: 0, revenue_total_kes: 0, feed_cost_total_kes: 0, cows_milked: 0 });
    for (const card of MONEY_CARDS) expect(statCardProps(card, zeros, { copy }).value).toBe('KES 0');
    const missing = readDailySummary({ cows_milked: 0 });
    for (const card of MONEY_CARDS) expect(statCardProps(card, missing, { copy }).value).toBeNull();
  });

  it('shows a negative milk remaining in the danger tone', () => {
    const figures = readDailySummary({ remaining_milk_liters: -20 });
    expect(statCardProps(byId(MILK_CARDS, 'milkRemaining'), figures, { copy })).toMatchObject({ value: '−20.0', tone: 'danger' });
  });

  it('puts the daily report’s revenue behind the info button', () => {
    const card = byId(MONEY_CARDS, 'revenue');
    const withReport = statCardProps(card, readDailySummary({ revenue_total_kes: 5200, revenue_breakdown: { report_sales_revenue_kes: 5000 } }), { copy });
    expect(withReport.tooltip).toBe('Revenue from the daily report: KES 5,000');
    expect(withReport.tooltipLabel).toBe('About transaction revenue');
    expect(statCardProps(card, readDailySummary({ revenue_total_kes: 5200 }), { copy }).tooltip).toBeUndefined();
  });

  it('gives each milk card its unit', () => {
    const figures = readDailySummary({ production_total_liters: 84.5, cows_milked: 7, avg_per_cow: 12.1, profit_per_liter: 18 });
    expect(statCardProps(byId(MILK_CARDS, 'totalMilk'), figures, { copy })).toMatchObject({ value: '84.5', unit: 'Liters' });
    expect(statCardProps(byId(MILK_CARDS, 'cowsMilked'), figures, { copy })).toMatchObject({ value: '7', unit: 'Cows' });
    expect(statCardProps(byId(MILK_CARDS, 'averagePerCow'), figures, { copy })).toMatchObject({ value: '12.1', unit: 'L/cow' });
    expect(statCardProps(byId(MILK_CARDS, 'profitPerLiter'), figures, { copy })).toMatchObject({ value: 'KES 18.00', unit: undefined });
  });
});
