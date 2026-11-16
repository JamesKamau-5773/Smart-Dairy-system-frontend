import { downloadBlob } from './download';
import { formatDateTime } from './audit';
import { financeCopy } from '../i18n/finance';

export function formatMoney(value) {
  const amount = Number(value || 0);
  return `KES ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "03 Nov 2026 14:05" in the chosen language; "Not recorded" when there is no readable date. */
export function formatReceiptDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || financeCopy.receipt.notRecorded;
  return formatDateTime(date);
}

export function formatReceiptText(receipt) {
  const text = financeCopy.receipt.text;
  const missing = financeCopy.receipt.notRecorded;
  return [
    receipt.tenant?.name || text.fallbackTitle,
    text.official,
    '------------------------------',
    text.number(receipt.receipt_number),
    text.status(receipt.status),
    text.farm(receipt.farm?.name || missing),
    text.issued(receipt.issued_at),
    text.transactionDate(receipt.transaction_date || missing),
    text.source(receipt.counterparty_name || missing),
    text.category(receipt.category),
    text.method(receipt.payment_method || missing),
    text.reference(receipt.payment_reference || missing),
    text.description(receipt.description || missing),
    text.amount(formatMoney(receipt.amount)),
    text.document(receipt.document_sha256),
  ].join('\n');
}

export function downloadReceiptPdf(receipt, blob) {
  downloadBlob(blob, `${receipt.receipt_number || 'receipt'}.pdf`);
}

export function shareReceiptText(receipt) {
  const text = formatReceiptText(receipt);
  if (navigator.share) {
    return navigator.share({
      title: financeCopy.receipt.text.shareTitle(receipt.receipt_number),
      text,
    });
  }

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return Promise.resolve();
}
