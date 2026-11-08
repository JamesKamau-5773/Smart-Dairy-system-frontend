import { feedCopy } from '../i18n/feed.en';

// Taking stock out (use or write-off) and correcting it with a physical count.
// Stock is never edited directly: each change is a recorded movement with a reason.

const { stockOut: outCopy, stockCount: countCopy } = feedCopy;

// Backend movement types (inventory API `_parse_movement_payload`). Write-offs also
// post an "Inventory Write Off" expense to the ledger; normal use does not.
export const STOCK_OUT_REASONS = Object.freeze([
  { value: 'USAGE', writeOff: false },
  { value: 'SPOILAGE', writeOff: true },
  { value: 'SPILL', writeOff: true },
  { value: 'EXPIRED', writeOff: true },
  { value: 'DAMAGE', writeOff: true },
  { value: 'SHRINKAGE', writeOff: true },
]);

export const EMPTY_STOCK_OUT = Object.freeze({ quantity: '', reason: 'USAGE', notes: '' });

export const isWriteOff = (reason) => STOCK_OUT_REASONS.some((option) => option.value === reason && option.writeOff);

const round = (value) => Math.round(Number(value) * 1000) / 1000;

/** `{ field: message }`; empty when the stock can be taken out. */
export function validateStockOut(form, currentStock) {
  const errors = {};
  const quantity = Number(form.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = outCopy.quantityInvalid;
  else if (quantity > Number(currentStock ?? 0)) errors.quantity = outCopy.moreThanStock(round(currentStock ?? 0));
  if (!STOCK_OUT_REASONS.some((option) => option.value === form.reason)) errors.reason = outCopy.reasonRequired;
  return errors;
}

/** The `POST /inventory/movements` body for taking stock out of `item`. */
export function buildStockOutMovement(item, form) {
  const movement = {
    item_id: item.id || item.sku,
    quantity: Number(form.quantity),
    transaction_type: form.reason,
    movement_type: form.reason,
  };
  if (form.notes?.trim()) movement.notes = form.notes.trim();
  return movement;
}

/** `{ counted: message }`; empty when the count can be sent. */
export function validateStockCount(counted) {
  const value = Number(counted);
  return counted === '' || counted === null || !Number.isFinite(value) || value < 0
    ? { counted: countCopy.countInvalid }
    : {};
}

/** How a physical count compares with the recorded stock, for the preview line. */
export function describeCountDifference(counted, currentStock) {
  if (counted === '' || !Number.isFinite(Number(counted))) return null;
  const difference = round(Number(counted) - Number(currentStock ?? 0));
  if (Math.abs(difference) < 0.01) return { kind: 'match', difference: 0 };
  return { kind: difference > 0 ? 'gain' : 'loss', difference: Math.abs(difference) };
}
