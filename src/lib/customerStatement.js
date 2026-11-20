// The shared buyer statement (`GET /api/statements/<token>`), read exactly as the backend
// sends it: `{ customer, transactions }`. Nothing is filled in: a missing figure stays null
// and is shown as "—".

const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * @param {unknown} raw The statement response body.
 * @returns {{
 *   customerName: string|null,
 *   balance: number|null,
 *   transactions: Array<{ id: string|number|null, date: string|null, description: string|null, reference: string|null, amount: number|null }>,
 * }}
 */
export function normalizeStatement(raw) {
  const customer = raw && typeof raw.customer === 'object' && raw.customer ? raw.customer : {};
  const transactions = Array.isArray(raw?.transactions) ? raw.transactions : [];
  return {
    customerName: typeof customer.name === 'string' && customer.name.trim() ? customer.name : null,
    balance: toAmount(customer.account_balance),
    transactions: transactions.map((tx) => ({
      id: tx?.id ?? null,
      date: tx?.date ?? null,
      description: tx?.description || tx?.category || null,
      reference: tx?.reference_code || null,
      amount: toAmount(tx?.amount),
    })),
  };
}
