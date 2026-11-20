import { describe, expect, it } from 'vitest';
import { canDownloadPayslips, nextPayrollPeriod, payrollRunToCsv, runStatus, sortRunsNewestFirst, statutoryBreakdown } from '../payroll';
import { defaultCostClass, missingLedgerFields } from '../ledgerForm';
import { accountLabel, roleLabel, staffStatus } from '../staffLabels';

const run = (year, month, extra = {}) => ({ id: `${year}-${month}`, payrollYear: year, payrollMonth: month, ...extra });

describe('payroll periods', () => {
  it('orders runs by the backend’s year and month, not list order', () => {
    expect(sortRunsNewestFirst([run(2026, 9), run(2026, 11), run(2025, 12)]).map((r) => r.id)).toEqual(['2026-11', '2026-9', '2025-12']);
  });

  it('takes the next period from the newest run, rolling over the year', () => {
    expect(nextPayrollPeriod([run(2026, 9), run(2026, 11)])).toEqual({ payroll_year: 2026, payroll_month: 12 });
    expect(nextPayrollPeriod([run(2026, 12)])).toEqual({ payroll_year: 2027, payroll_month: 1 });
  });

  it('prefers the backend’s next period when it sends one', () => {
    expect(nextPayrollPeriod([run(2026, 11)], { payroll_year: 2027, payroll_month: 3 })).toEqual({ payroll_year: 2027, payroll_month: 3 });
  });

  it('starts at this month when there are no runs', () => {
    expect(nextPayrollPeriod([], null, new Date(2026, 10, 3))).toEqual({ payroll_year: 2026, payroll_month: 11 });
  });

  it('words run status for people', () => {
    expect(runStatus('FINALIZED').label).toMatch(/ready to pay/);
  });

  it('exports a run as CSV with quoted text', () => {
    const csv = payrollRunToCsv({ lineItems: [{ name: 'Otieno, P.', role: 'Farmhand', base: 30000, leaveDeduction: 0, grossPay: 30000, paye: 731.25, nssfEmployee: 1800, shif: 825, housingLevyEmployee: 450, advanceDeduction: 0, net: 26193.75, status: 'PENDING' }] });
    expect(csv.split('\n')[0]).toContain('PAYE,NSSF,SHIF,Housing Levy');
    expect(csv.split('\n')[1]).toBe('"Otieno, P.",Farmhand,30000,0,30000,731.25,1800,825,450,0,26193.75,Not paid yet');
  });

  it('lists statutory deductions as the backend sent them', () => {
    expect(statutoryBreakdown({ paye: 731.25, nssfEmployee: 1800, shif: 825, housingLevyEmployee: 450 })).toBe('PAYE 731.25 · NSSF 1,800 · SHIF 825 · Housing Levy 450');
    expect(statutoryBreakdown({ paye: null })).toBe('');
    expect(canDownloadPayslips('DRAFT')).toBe(false);
    expect(canDownloadPayslips('Paid')).toBe(true);
  });
});

describe('staff labels', () => {
  it('never shows raw codes', () => {
    expect(roleLabel('FARM_HAND')).toBe('Farmhand');
    expect(roleLabel('farm-manager')).toBe('Farm manager');
    expect(staffStatus('ON_LEAVE').label).toBe('On leave');
    expect(staffStatus('INACTIVE').label).toBe('Former staff');
    expect(accountLabel('INVITE_PENDING')).toBe('Invite sent');
    expect(accountLabel(undefined)).toBe('No app access');
  });
});

describe('ledger form', () => {
  const expense = { date: '2026-11-03', amount: '2500', category: 'Utilities', party: 'KPLC', item_name: 'Electricity', animal_ids: [], animal_cost_type: '' };

  it('lets an expense be saved without choosing animals', () => {
    expect(missingLedgerFields(expense, 'expense')).toEqual([]);
  });

  it('names exactly what is still missing', () => {
    expect(missingLedgerFields({ ...expense, party: '', amount: '' }, 'expense')).toEqual(['the amount', 'the supplier or payee']);
    expect(missingLedgerFields({ ...expense, category: 'Feed Purchase', quantity: '' }, 'expense')).toContain('the quantity');
    expect(missingLedgerFields({ ...expense, animal_ids: [4] }, 'expense')).toContain('how the cost applies to the chosen animals');
  });

  it('needs a reference for non-cash customer payments', () => {
    const income = { date: '2026-11-03', amount: '900', incomePayerType: 'customer', customer_id: '3', paymentMethod: 'M-Pesa', reference_code: '' };
    expect(missingLedgerFields(income, 'income')).toEqual(['the payment reference']);
    expect(missingLedgerFields({ ...income, paymentMethod: 'Cash' }, 'income')).toEqual([]);
  });

  it('suggests a cost class from the category', () => {
    expect(defaultCostClass('Feed Purchase')).toBe('production_cost');
    expect(defaultCostClass('Transport')).toBe('customer_acquisition');
    expect(defaultCostClass('Something new')).toBe('operating_cost');
  });
});
