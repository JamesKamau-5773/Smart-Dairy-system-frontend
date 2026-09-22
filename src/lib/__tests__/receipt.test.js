import { describe, expect, it } from 'vitest';
import { formatReceiptText } from '../receipt';

describe('receipt utilities', () => {
  it('formats a server-issued receipt without replacing its identifiers', () => {
    const receipt = {
      id: 9,
      receipt_number: 'RCPT-2026-000101',
      issued_at: '2026-08-28T10:00:00+00:00',
      amount: 1250.5,
      category: 'Milk Sale',
      counterparty_name: 'Kamau Farm',
      payment_reference: 'REF-123',
      description: 'Milk payment for August batch',
      payment_method: 'M-Pesa',
      tenant: { name: 'Jivu Farm' },
    };

    const text = formatReceiptText(receipt);
    expect(text).toContain('RCPT-2026-000101');
    expect(text).toContain('Payment reference: REF-123');
    expect(text).toContain('KES 1,250.50');
  });

  it('formats readable receipt text for sharing', () => {
    const receipt = {
      id: 'tx-202',
      receipt_number: 'RCPT-2026-000202',
      issued_at: '2026-08-30T10:00:00+00:00',
      amount: 500,
      category: 'Other Income',
      counterparty_name: 'County show',
      payment_method: 'Cash',
      payment_reference: 'CASH-30',
      description: 'Farm gate sale',
      tenant: { name: 'Jivu Farm' },
    };

    const text = formatReceiptText(receipt);
    expect(text).toContain('RCPT-2026-000202');
    expect(text).toContain('Jivu Farm');
    expect(text).toContain('County show');
    expect(text).toContain('KES 500.00');
  });
});
