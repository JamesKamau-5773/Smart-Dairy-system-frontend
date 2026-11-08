import { compressAnimalPhoto, formatPhotoSize } from './animalPhoto';

// The backend's limits (STAFF_PAYROLL_SAFETY_LEDGER_API.md, "Receipt photos").
// Checked here only to answer straight away; the backend enforces them.
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
// TODO(BR-014): defaults from that document, used until the session's entitlements carry
// `limits.receipt_upload_max_bytes` and `limits.receipts_per_entry` (see receiptLimits).
export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;
export const RECEIPT_MAX_PER_ENTRY = 5;

/**
 * The receipt limits to check against: the backend's (from `useEntitlements()`) when it sends
 * them, otherwise the documented defaults above.
 * @returns {{ maxBytes: number, maxPerEntry: number }}
 */
export function receiptLimits(entitlements) {
  const maxBytes = entitlements?.limit?.('receipt_upload_max_bytes');
  const maxPerEntry = entitlements?.limit?.('receipts_per_entry');
  return {
    maxBytes: maxBytes > 0 ? maxBytes : RECEIPT_MAX_BYTES,
    maxPerEntry: maxPerEntry > 0 ? maxPerEntry : RECEIPT_MAX_PER_ENTRY,
  };
}
const ALLOWED_TYPES = new Set(RECEIPT_ACCEPT.split(','));
// Large enough to read small print on a till slip.
const RECEIPT_MAX_DIMENSION = 2000;

/** The row's attachments as the backend sent them (never invented). */
export function readAttachments(transaction) {
  return Array.isArray(transaction?.attachments) ? transaction.attachments : [];
}

export const isPdfAttachment = (attachment) => String(attachment?.content_type || '').toLowerCase() === 'application/pdf';

/**
 * Shrinks a phone photo to save data, then checks it against the backend's limits.
 * Returns `{ file }` ready to upload, or `{ error }` in plain words.
 */
export async function prepareReceiptFile(file, { maxBytes = RECEIPT_MAX_BYTES } = {}) {
  if (!file) return { error: 'Choose a photo or PDF of the receipt.' };
  if (!ALLOWED_TYPES.has(file.type)) return { error: 'Use a photo (JPEG, PNG or WebP) or a PDF.' };
  const ready = file.type === 'application/pdf' ? file : await compressAnimalPhoto(file, { maxDimension: RECEIPT_MAX_DIMENSION, quality: 0.85 });
  if (ready.size > maxBytes) {
    return { error: `This file is ${formatPhotoSize(ready.size)}. The limit is ${formatPhotoSize(maxBytes)}.` };
  }
  return { file: ready };
}
