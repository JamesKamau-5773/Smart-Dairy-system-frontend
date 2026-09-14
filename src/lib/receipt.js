export function formatMoney(value) {
  const amount = Number(value || 0);
  return `KSh ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatReceiptDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not recorded';

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatReceiptText(receipt) {
  return [
    receipt.tenant?.name || 'Payment receipt',
    'Official payment receipt',
    '------------------------------',
    `Receipt number: ${receipt.receipt_number}`,
    `Status: ${receipt.status}`,
    `Farm: ${receipt.farm?.name || 'Not recorded'}`,
    `Issued: ${receipt.issued_at}`,
    `Transaction date: ${receipt.transaction_date || 'Not recorded'}`,
    `Customer / Source: ${receipt.counterparty_name || 'Not recorded'}`,
    `Category: ${receipt.category}`,
    `Payment method: ${receipt.payment_method || 'Not recorded'}`,
    `Payment reference: ${receipt.payment_reference || 'Not recorded'}`,
    `Description: ${receipt.description || 'Not recorded'}`,
    `Amount: ${formatMoney(receipt.amount)}`,
    `Document SHA-256: ${receipt.document_sha256}`,
  ].join('\n');
}

export function downloadReceiptPdf(receipt, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${receipt.receipt_number || 'receipt'}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function shareReceiptText(receipt) {
  const text = formatReceiptText(receipt);
  if (navigator.share) {
    return navigator.share({
      title: `Receipt ${receipt.receipt_number}`,
      text,
    });
  }

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return Promise.resolve();
}
