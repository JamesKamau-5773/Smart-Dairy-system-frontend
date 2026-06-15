export const BUYER_BILLING_DATA = {
  c_001: {
    buyer: {
      id: 'c_001',
      name: "Wanjiku's Kiosk",
      type: 'Retail',
      contact: '0712 555 123',
      rate_per_liter: 60,
      total_owed: 12450,
      total_paid: 8750,
      balance: 3700,
      status: 'Active',
      billing_cycle: 'Weekly',
      whatsapp: '254712555123',
    },
    summary: {
      liters_delivered: 207.5,
      invoice_total: 12450,
      payments_received: 8750,
      outstanding_balance: 3700,
    },
    payment_history: [
      { id: 'pay_1', date: '2026-05-27', method: 'M-Pesa', amount: 2500, note: 'Partial settlement' },
      { id: 'pay_2', date: '2026-05-23', method: 'Cash', amount: 2000, note: 'Weekly cash drop' },
      { id: 'pay_3', date: '2026-05-18', method: 'M-Pesa', amount: 4250, note: 'Opening balance clearance' },
    ],
    consumption_breakdown: [
      { date: '2026-05-28', shift: 'AM', liters: 3.0, rate: 60, amount: 180 },
      { date: '2026-05-28', shift: 'PM', liters: 2.0, rate: 60, amount: 120 },
      { date: '2026-05-27', shift: 'AM', liters: 3.5, rate: 60, amount: 210 },
      { date: '2026-05-27', shift: 'PM', liters: 1.5, rate: 60, amount: 90 },
      { date: '2026-05-26', shift: 'AM', liters: 4.0, rate: 60, amount: 240 },
    ],
  },
  c_002: {
    buyer: {
      id: 'c_002',
      name: 'Rift Valley Cooperative',
      type: 'Cooperative',
      contact: '0722 123 456',
      rate_per_liter: 58,
      total_owed: 48250,
      total_paid: 30000,
      balance: 18250,
      status: 'Active',
      billing_cycle: 'Monthly',
      whatsapp: '254722123456',
    },
    summary: {
      liters_delivered: 832.5,
      invoice_total: 48250,
      payments_received: 30000,
      outstanding_balance: 18250,
    },
    payment_history: [
      { id: 'pay_1', date: '2026-05-25', method: 'Bank', amount: 15000, note: 'Mid-month remittance' },
      { id: 'pay_2', date: '2026-05-10', method: 'Bank', amount: 15000, note: 'Monthly remittance' },
    ],
    consumption_breakdown: [
      { date: '2026-05-28', shift: 'AM', liters: 12.0, rate: 58, amount: 696 },
      { date: '2026-05-28', shift: 'PM', liters: 10.0, rate: 58, amount: 580 },
      { date: '2026-05-27', shift: 'AM', liters: 11.5, rate: 58, amount: 667 },
      { date: '2026-05-27', shift: 'PM', liters: 9.0, rate: 58, amount: 522 },
    ],
  },
  c_003: {
    buyer: {
      id: 'c_003',
      name: 'Bahati Local Market',
      type: 'Retail',
      contact: '0733 888 444',
      rate_per_liter: 62,
      total_owed: 8500,
      total_paid: 8500,
      balance: 0,
      status: 'Settled',
      billing_cycle: 'Daily',
      whatsapp: '254733888444',
    },
    summary: {
      liters_delivered: 137.1,
      invoice_total: 8500,
      payments_received: 8500,
      outstanding_balance: 0,
    },
    payment_history: [
      { id: 'pay_1', date: '2026-05-27', method: 'Cash', amount: 8500, note: 'Cleared in full' },
    ],
    consumption_breakdown: [
      { date: '2026-05-27', shift: 'AM', liters: 2.1, rate: 62, amount: 130 },
      { date: '2026-05-27', shift: 'PM', liters: 1.9, rate: 62, amount: 118 },
      { date: '2026-05-26', shift: 'AM', liters: 2.5, rate: 62, amount: 155 },
    ],
  },
};

export function getBuyerBillingList() {
  return Object.values(BUYER_BILLING_DATA).map((entry) => entry.buyer);
}

export function getBuyerBillingProfile(buyerId) {
  return BUYER_BILLING_DATA[buyerId] || null;
}
