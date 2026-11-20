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

/** The PDF's file name: the receipt number the backend issued. */
export const receiptFileName = (receipt) => `${receipt.receipt_number || 'receipt'}.pdf`;

export function downloadReceiptPdf(receipt, blob) {
  downloadBlob(blob, receiptFileName(receipt));
}

function canShareFiles(files) {
  try {
    return Boolean(navigator.canShare?.({ files }));
  } catch {
    return false;
  }
}

/** Whether this browser can hand a PDF to another app (WhatsApp, email), so it's worth fetching first. */
export function canSharePdf() {
  if (typeof File === 'undefined') return false;
  return canShareFiles([new File([''], 'receipt.pdf', { type: 'application/pdf' })]);
}

/**
 * Shares a receipt the best way the device allows: the backend's PDF as a file, else the receipt
 * as text, else the text copied to the clipboard. Rejects as navigator.share does (AbortError
 * when the user closes the share sheet, NotAllowedError when the tap is too long ago).
 *
 * @param {object} receipt The receipt from GET /finance/receipts/{id}.
 * @param {Blob|null} [pdf] Its PDF, when already downloaded.
 * @returns {Promise<'file'|'text'|'copied'|'none'>} How it was shared; 'none' when the device can do neither.
 */
export async function shareReceipt(receipt, pdf = null) {
  const title = financeCopy.receipt.text.shareTitle(receipt.receipt_number);
  if (pdf) {
    const files = [new File([pdf], receiptFileName(receipt), { type: 'application/pdf' })];
    if (canShareFiles(files)) {
      await navigator.share({ files, title });
      return 'file';
    }
  }

  const text = formatReceiptText(receipt);
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'text';
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }
  return 'none';
}
