import { describe, it, expect } from 'vitest';
import { buildWhatsAppInvoiceMessage } from '../../../lib/billing';

describe('buildWhatsAppInvoiceMessage', () => {
  it('formats a customer invoice for WhatsApp sharing', () => {
    const message = buildWhatsAppInvoiceMessage({
      buyer: {
        name: 'Wanjiku\'s Kiosk',
        id: 'c_001',
      },
      summary: {
        outstanding_balance: 3700,
        liters_delivered: 207.5,
        invoice_total: 12450,
        payments_received: 8750,
      },
      consumption_breakdown: [
        { date: '2026-05-28', shift: 'AM', liters: 3.0, rate: 60, amount: 180 },
        { date: '2026-05-28', shift: 'PM', liters: 2.0, rate: 60, amount: 120 },
      ],
    });

    expect(message).toContain('Hello Wanjiku\'s Kiosk,');
    expect(message).toContain('Customer: Wanjiku\'s Kiosk');
    expect(message).toContain('Current balance: KSh 3,700.00');
    expect(message).toContain('2026-05-28 AM: 3L x 60 = KSh 180.00');
    expect(message).toContain('2026-05-28 PM: 2L x 60 = KSh 120.00');
    expect(message).toContain('Invoice total: KSh 12,450.00');
    expect(message).toContain('Payments received: KSh 8,750.00');
    expect(message).toContain('Outstanding balance: KSh 3,700.00');
  });
});
