export function formatMoney(value) {
  return `KSh ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildWhatsAppInvoiceMessage(profile) {
  const lines = profile.consumption_breakdown.map((row) => `${row.date} ${row.shift}: ${row.liters}L x ${row.rate} = ${formatMoney(row.amount)}`);
  return [
    `Hello ${profile.buyer.name},`,
    '',
    `Here is your milk statement for the current billing cycle.`,
    `Customer: ${profile.buyer.name}`,
    `Account: ${profile.buyer.id}`,
    `Current balance: ${formatMoney(profile.summary.outstanding_balance)}`,
    '',
    'Daily consumption:',
    ...lines,
    '',
    `Total liters delivered: ${profile.summary.liters_delivered}L`,
    `Invoice total: ${formatMoney(profile.summary.invoice_total)}`,
    `Payments received: ${formatMoney(profile.summary.payments_received)}`,
    `Outstanding balance: ${formatMoney(profile.summary.outstanding_balance)}`,
    '',
    'Thank you for your continued support.',
  ].join('\n');
}
