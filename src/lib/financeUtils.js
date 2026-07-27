/**
 * Calculates financial KPIs from a list of transactions.
 * @param {Array<Object>} transactions - A list of transaction objects.
 * Each object should have 'type' ('income' or 'expense') and 'amount'.
 * @returns {{totalIncome: number, totalCosts: number}}
 */
export function calculateKpis(transactions = []) {
  if (!Array.isArray(transactions)) {
    return { totalIncome: 0, totalCosts: 0 };
  }

  return transactions.reduce((acc, tx) => {
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === 'income') {
      acc.totalIncome += amount;
    } else {
      acc.totalCosts += Math.abs(amount);
    }
    return acc;
  }, { totalIncome: 0, totalCosts: 0 });
}