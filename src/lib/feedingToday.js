import { feedCopy } from '../i18n/feed';

// Reading the backend's `GET /nutrition/feeding/today` for the people doing the feeding.

const { notReady } = feedCopy.today;

const round = (value, places = 2) => {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
};

/** The batch in store that this group is fed from, or null. */
export function findActiveBatch(today, group) {
  return (today?.active_batches ?? []).find((batch) => batch.batch_id === group.active_batch_id) ?? null;
}

// Backend `groups[].not_ready_reason` codes (FEED_INVENTORY_API_CHANGES), in the backend's
// order of precedence: no mix, no animals, no concentrate rate, no batch.
const REASON_COPY = Object.freeze({
  NO_MIX: notReady.noMix,
  NO_CONCENTRATE_RATE: notReady.noRate,
  NO_ANIMALS: notReady.noAnimals,
  NO_ACTIVE_BATCH: notReady.noBatch,
});

/**
 * `{ canFeed, reason, batch, perFeedingKg }`. The backend decides whether a group
 * can be fed and why not (`ready`, `not_ready_reason`); this only words it.
 */
export function getFeedingReadiness(today, group) {
  const batch = findActiveBatch(today, group);
  const code = group.not_ready_reason ?? null;
  // The backend sets `ready: true` only when there is no reason; anything else blocks.
  if (code || group.ready !== true) {
    return { canFeed: false, reason: REASON_COPY[code] ?? group.not_ready_message ?? notReady.unknown, batch, perFeedingKg: 0 };
  }

  // Guard against inconsistent data: feeding is recorded against a listed batch.
  if (!batch) return { canFeed: false, reason: notReady.noBatch, batch, perFeedingKg: 0 };

  return { canFeed: true, reason: '', batch, perFeedingKg: round(group.group_batch_per_feeding_kg) };
}

/** An amount the farmer may record against a batch: above 0 and no more than what's left. */
export function isValidFeedAmount(amount, batch) {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 && value <= Number(batch?.remaining_kg ?? Infinity);
}
