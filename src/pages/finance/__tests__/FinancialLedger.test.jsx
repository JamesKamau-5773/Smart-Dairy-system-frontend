import { buildLedgerEntryPayload } from '../../../lib/ledgerEntryPayload';
import { describe, expect, it } from 'vitest';

const commonForm = {
  date: '2026-08-28',
  amount: '1250.50',
  paymentMethod: 'M-Pesa',
  reference_code: 'REF-123',
  description: 'Ledger test',
};

describe('buildLedgerEntryPayload', () => {
  it('builds registered-customer income without expense fields', () => {
    expect(buildLedgerEntryPayload({
      ...commonForm,
      category: 'Milk Sale',
      incomePayerType: 'customer',
      customer_id: 7,
      income_source: '',
      party: '',
    }, 'income')).toEqual({
      date: '2026-08-28',
      amount: 1250.5,
      payment_method: 'M-Pesa',
      reference_code: 'REF-123',
      description: 'Ledger test',
      type: 'income',
      category: 'Milk Sale',
      customer_id: 7,
    });
  });

  it('builds free-text income using income_source', () => {
    const payload = buildLedgerEntryPayload({
      ...commonForm,
      category: 'Other Income',
      incomePayerType: 'other',
      customer_id: '',
      income_source: '  County show  ',
      party: '',
    }, 'income');

    expect(payload.income_source).toBe('County show');
    expect(payload).not.toHaveProperty('customer_id');
    expect(payload).not.toHaveProperty('paid_to');
  });

  it('builds an expense using paid_to and the purchased item name', () => {
    const payload = buildLedgerEntryPayload({
      ...commonForm,
      category: 'Feed Purchase',
      incomePayerType: 'customer',
      customer_id: '7',
      income_source: 'Ignored source',
      party: '  Feed Supplier  ',
      item_name: '  Maize Meal  ',
      quantity: '50',
      cost_class: 'COGS',
      description: 'Bulk purchase for cows',
    }, 'expense');

    expect(payload.paid_to).toBe('Feed Supplier');
    expect(payload.item_name).toBe('Maize Meal');
    expect(payload.quantity).toBe(50);
    expect(payload.cost_class).toBe('COGS');
    expect(payload.description).toBe('Bulk purchase for cows');
    expect(payload).not.toHaveProperty('customer_id');
    expect(payload).not.toHaveProperty('income_source');
  });
});
