import { describe, it, expect } from 'vitest';
import { calculateKpis } from '../financeUtils';

describe('calculateKpis', () => {
  it('should return zero for empty or invalid input', () => {
    expect(calculateKpis([])).toEqual({ totalIncome: 0, totalCosts: 0 });
    expect(calculateKpis(null)).toEqual({ totalIncome: 0, totalCosts: 0 });
    expect(calculateKpis(undefined)).toEqual({ totalIncome: 0, totalCosts: 0 });
  });

  it('should correctly calculate total income with only income transactions', () => {
    const transactions = [
      { type: 'income', amount: 100 },
      { type: 'income', amount: 250.50 },
    ];
    expect(calculateKpis(transactions)).toEqual({ totalIncome: 350.50, totalCosts: 0 });
  });

  it('should correctly calculate total costs with only expense transactions', () => {
    const transactions = [
      { type: 'expense', amount: -50 },
      { type: 'expense', amount: -75.25 },
    ];
    expect(calculateKpis(transactions)).toEqual({ totalIncome: 0, totalCosts: 125.25 });
  });

  it('should correctly calculate mixed income and costs', () => {
    const transactions = [
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: -200 },
      { type: 'income', amount: 500 },
      { type: 'expense', amount: -150.50 },
    ];
    expect(calculateKpis(transactions)).toEqual({ totalIncome: 1500, totalCosts: 350.50 });
  });

  it('should handle zero amounts and non-numeric amounts gracefully', () => {
    const transactions = [
      { type: 'income', amount: 500 },
      { type: 'expense', amount: 0 },
      { type: 'income', amount: 'not-a-number' },
    ];
    expect(calculateKpis(transactions)).toEqual({ totalIncome: 500, totalCosts: 0 });
  });
});