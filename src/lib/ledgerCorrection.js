// Correcting a posted ledger entry: the backend voids it and posts a linked replacement.
// These helpers read only the fields the backend sends on each ledger row.

const isBlank = (value) => value === null || value === undefined || value === '';

/**
 * 'expense' or 'income' when the row can be corrected here; null otherwise.
 * Income linked to a customer or buyer account is corrected through that account,
 * and an entry that was already corrected points at its replacement.
 */
export function correctionKind(transaction) {
  if (!transaction || String(transaction.status || '').toUpperCase() !== 'POSTED') return null;
  if (!isBlank(transaction.replacement_transaction_id)) return null;
  const type = String(transaction.transaction_type || transaction.type || '').toLowerCase();
  if (type === 'expense') return 'expense';
  if (type === 'revenue' && isBlank(transaction.customer_id) && isBlank(transaction.buyer_id)) return 'income';
  return null;
}

/** The entry's ledger category (income rows also carry a display category). */
export const originalCategory = (transaction) => transaction?.transaction_category ?? transaction?.category ?? '';

/**
 * Reads an amount typed in the form: a positive number with at most two decimals,
 * or null when it isn't one.
 */
export function parseCorrectionAmount(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return amount > 0 ? amount : null;
}

/**
 * The request body. Only fields that change are sent; the backend keeps the
 * original value for anything left out. Income entries never carry a cost class.
 */
export function buildCorrectionPayload({ kind, transaction, reason, category, costClass, amount }) {
  const replacement = {};
  if (category && category !== originalCategory(transaction)) replacement.category = category;
  if (kind === 'expense' && costClass) replacement.cost_class = costClass;
  if (amount !== null && amount !== undefined && Number(amount) !== Number(transaction.amount)) replacement.amount = Number(amount);
  return { void_reason: String(reason || '').trim(), replacement };
}

/** True when the form would change something. */
export function correctionChangesSomething({ kind, transaction, category, costClass, amount }) {
  const { replacement } = buildCorrectionPayload({ kind, transaction, reason: '', category, costClass, amount });
  const costClassChanged = kind === 'expense' && costClass && costClass !== transaction.cost_class;
  return Boolean(replacement.category || replacement.amount !== undefined || costClassChanged);
}
