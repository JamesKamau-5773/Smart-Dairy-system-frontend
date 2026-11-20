import { describe, expect, it } from 'vitest';
import { buildCorrectionPayload, correctionChangesSomething, correctionKind, parseCorrectionAmount } from '../ledgerCorrection';
import { RECEIPT_MAX_BYTES, prepareReceiptFile, readAttachments } from '../receiptAttachments';
import { isReplayableMutation } from '../offlinePolicy';
import { normalizeStaffRecord } from '../backendApi';

const expense = { id: 1, status: 'POSTED', transaction_type: 'Expense', category: 'Transport', transaction_category: 'Transport', cost_class: 'OPERATING', amount: 1200 };
const income = { id: 2, status: 'POSTED', transaction_type: 'Revenue', category: 'Other Income', transaction_category: 'Other Income', amount: 5000, customer_id: null, buyer_id: null };

describe('ledger corrections', () => {
  it('allows posted expenses and unlinked income only', () => {
    expect(correctionKind(expense)).toBe('expense');
    expect(correctionKind(income)).toBe('income');
    expect(correctionKind({ ...income, customer_id: 4 })).toBeNull();
    expect(correctionKind({ ...income, buyer_id: 9 })).toBeNull();
    expect(correctionKind({ ...expense, status: 'VOIDED' })).toBeNull();
    expect(correctionKind({ ...expense, replacement_transaction_id: 7 })).toBeNull();
    expect(correctionKind({ ...expense, transaction_type: 'Payment' })).toBeNull();
  });

  it('reads typed amounts strictly', () => {
    expect(parseCorrectionAmount('1,500.50')).toBe(1500.5);
    expect(parseCorrectionAmount('0')).toBeNull();
    expect(parseCorrectionAmount('12.345')).toBeNull();
    expect(parseCorrectionAmount('abc')).toBeNull();
  });

  it('sends only what changed, and never a cost class on income', () => {
    expect(buildCorrectionPayload({ kind: 'expense', transaction: expense, reason: ' Typo ', category: 'Transport', costClass: 'OPERATING', amount: 1500 }))
      .toEqual({ void_reason: 'Typo', replacement: { cost_class: 'OPERATING', amount: 1500 } });
    expect(buildCorrectionPayload({ kind: 'income', transaction: income, reason: 'x', category: 'Milk Sale', costClass: 'COGS', amount: 5000 }))
      .toEqual({ void_reason: 'x', replacement: { category: 'Milk Sale' } });
  });

  it('knows when nothing would change', () => {
    expect(correctionChangesSomething({ kind: 'expense', transaction: expense, category: 'Transport', costClass: 'OPERATING', amount: 1200 })).toBe(false);
    expect(correctionChangesSomething({ kind: 'expense', transaction: expense, category: 'Transport', costClass: 'COGS', amount: 1200 })).toBe(true);
  });

  it('never queues corrections, receipt uploads, holds or milk tests offline', () => {
    expect(isReplayableMutation({ method: 'post', url: '/finance/transactions/3/corrections' })).toBe(false);
    expect(isReplayableMutation({ method: 'post', url: '/finance/transactions/3/attachments' })).toBe(false);
    expect(isReplayableMutation({ method: 'post', url: '/safety/holds' })).toBe(false);
    expect(isReplayableMutation({ method: 'post', url: '/safety/milk-tests' })).toBe(false);
  });
});

describe('receipt photos', () => {
  it('reads only the attachments the backend sent', () => {
    expect(readAttachments({})).toEqual([]);
    expect(readAttachments({ attachments: [{ id: 1 }] })).toHaveLength(1);
  });

  it('accepts a small PDF and refuses other types or oversized files', async () => {
    const pdf = new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' });
    expect((await prepareReceiptFile(pdf)).file).toBe(pdf);
    expect((await prepareReceiptFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).error).toMatch(/photo .* or a PDF/);
    const big = new File([new Uint8Array(RECEIPT_MAX_BYTES + 1)], 'big.pdf', { type: 'application/pdf' });
    expect((await prepareReceiptFile(big)).error).toMatch(/limit is 4\.0 MB/);
  });
});

describe('statutory deductions switch', () => {
  it('reads the backend flag and never assumes one', () => {
    expect(normalizeStaffRecord({ statutory_deductions_enabled: false }).statutoryDeductionsEnabled).toBe(false);
    expect(normalizeStaffRecord({ statutoryDeductionsEnabled: true }).statutoryDeductionsEnabled).toBe(true);
    expect(normalizeStaffRecord({}).statutoryDeductionsEnabled).toBeNull();
  });
});
