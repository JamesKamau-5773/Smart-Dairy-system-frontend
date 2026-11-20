// Feed cost per litre of milk, read and shown the same way everywhere, so the
// weekly trend and the mix table can't disagree through formatting alone.

/**
 * The per-litre feed cost from a backend row, or null when it isn't there.
 * Only per-litre fields count: a generic `cost` may be a total, and a missing
 * value must not turn into a "free" KES 0.00.
 */
export function readFeedCostPerLitre(source) {
  const raw = source?.feedCostPerLiter ?? source?.feed_cost_per_liter ?? source?.costPerLiter ?? source?.cost_per_liter;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** "KES 12.34 / L", or "—" when unknown. */
export function formatCostPerLitre(value, { suffix = ' / L' } = {}) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `KES ${Number(value).toFixed(2)}${suffix}`;
}
