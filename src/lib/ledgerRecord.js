// Reading one ledger record as the API sends it. Display only: no figure is worked out here.

/** 'in' or 'out' from the record's own type; null when the API sent neither. */
export const directionOf = (tx) => {
  const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
  if (type === 'revenue' || type === 'income') return 'in';
  if (type === 'expense') return 'out';
  return null;
};

/**
 * (code) → the category's label in the reader's language, from useLedgerCategories' lists;
 * a code the lists don't know is shown as saved, and no code as "—".
 */
export const categoryLabeler = (categories) => {
  const labels = Object.fromEntries([...(categories?.income ?? []), ...(categories?.expense ?? [])]);
  return (code) => (code ? labels[code] ?? code : '—');
};

export const partyOf = (tx) => tx.counterparty_name || tx.customer_name || tx.buyer_name || '—';
export const descriptionOf = (tx) => [tx.item_name, tx.description].filter(Boolean).join(' · ');
export const bucketOf = (tx) => tx.bucket;
export const hasReceipt = (tx) => Boolean(tx.receipt_available && tx.receipt?.id);

/** The amount shown with the sign of the entry's own type: an expense negative; null if unknown. */
export const signedAmount = (tx) => {
  const amount = Number(tx.amount);
  const direction = directionOf(tx);
  if (!direction || tx.amount === null || tx.amount === undefined || !Number.isFinite(amount)) return null;
  return direction === 'out' ? -Math.abs(amount) : amount;
};
