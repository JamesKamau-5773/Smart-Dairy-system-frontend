import { resolveCowIdentityFromHerd } from './cowIdentity';

const isQueuedMilkEntry = (entry) => entry?.request?.method === 'POST'
  && /\/production\/yield$/.test(entry.request.url || '');

/** Turns queued (unsent) milk entries from the offline store into display rows. */
export function toQueuedMilkRows(entries = [], herd = []) {
  return entries.filter(isQueuedMilkEntry).map((entry) => {
    const data = entry.request.data ?? {};
    const identity = resolveCowIdentityFromHerd({ cowId: data.cow_id ?? data.cowId }, herd);
    const amount = Number(data.amount ?? data.volume);
    return {
      id: entry.id,
      cow: { cowName: identity.name, cowTag: identity.earTag || identity.recordId },
      date: data.milking_date ?? data.milkingDate ?? entry.createdAt.slice(0, 10),
      session: data.session ?? 'morning',
      amount: Number.isFinite(amount) ? amount.toFixed(1) : '--',
      needsAttention: entry.status === 'NEEDS_ATTENTION',
      error: entry.lastError?.message ?? null,
    };
  });
}
