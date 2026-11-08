import { feedCopy } from '../i18n/feed.en';

// The restock (delivery) form: what it may send and how it becomes a stock movement.

const { restock: copy } = feedCopy;

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

export const EMPTY_RESTOCK = Object.freeze({ quantity: '', unitCost: '', supplierName: '', recordExpense: false });

/** `{ field: message }`; empty when the delivery can be recorded. */
export function validateRestock(form) {
  const errors = {};
  const quantity = Number(form.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = copy.quantityInvalid;

  if (hasValue(form.unitCost)) {
    const cost = Number(form.unitCost);
    if (!Number.isFinite(cost) || cost < 0) errors.unitCost = copy.costInvalid;
  }
  // A ledger expense needs a price; the backend rejects record_expense without unit_cost.
  if (form.recordExpense && !hasValue(form.unitCost)) errors.unitCost = copy.recordExpenseNeedsCost;
  return errors;
}

/** The `POST /inventory/movements` body for a delivery of `item`. */
export function buildRestockMovement(item, form) {
  const movement = {
    item_id: item.id || item.sku,
    quantity: Number(form.quantity),
    transaction_type: 'IN',
    movement_type: 'restock',
    reference_note: `Restock for ${item.name || item.sku}`,
  };
  if (hasValue(form.unitCost)) movement.unit_cost = Number(form.unitCost);
  if (form.supplierName?.trim()) movement.supplier_name = form.supplierName.trim();
  if (form.recordExpense) movement.record_expense = true;
  return movement;
}
