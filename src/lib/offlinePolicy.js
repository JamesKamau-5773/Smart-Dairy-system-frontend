import { errorsCopy } from '../i18n/errors';

const ONLINE_ONLY_PATHS = [
  /^\/auth\//,
  /\/billing\/stk-push$/,
  /\/mpesa\//,
  /\/payments(?:\/|$)/,
  // Payroll runs move money and must not be replayed later from a stale device.
  /^\/hr\/payroll/,
  /\/void-and-replace$/,
  /^\/finance\/transactions\/[^/]+\/(?:corrections|attachments)$/,
  /\/switch-farm$/,
  /\/formulate(?:\/|$)/,
  /\/calculate-(?:nutrition|schedule)(?:\/|$)/,
  /\/calculator(?:\/|$)/,
  // Owner corrections to an item: the farmer needs to see them take effect (or fail)
  // now. Queued, they would report success while nothing changed.
  /^\/inventory\/items\/[^/]+\/(?:archive|restore|data-fixes)$/,
  // A count is compared with the server's balance when it arrives; replayed later it
  // would be compared with a newer balance and record the wrong correction.
  /^\/inventory\/items\/[^/]+\/audit$/,
  // Releasing or holding milk is a food-safety decision; replayed later from a stale
  // phone it could release milk that has since been put back on hold.
  /^\/(?:clinical\/)?(?:cows|livestock)\/[^/]+\/hardlock$/,
  // A hold or failed test must be on the board now, where everyone looks before milking;
  // a queued one would look placed while the milk was still going into the tank.
  /^\/safety\/(?:holds|milk-tests)$/,
  // Money owed by staff and leaving the farm change balances the server checks now.
  /^\/hr\/staff\/[^/]+\/(?:advances|advance-repayments|offboard)$/,
  // Saving the daily routine replaces the whole plan; replayed later from a stale phone it
  // would overwrite a newer plan saved from another phone.
  /^\/routine\/plans$/,
];

// Deleting a cow, a customer or a stock item is final, and the farmer confirms it by typing
// its name: it has to happen (or fail) while they watch. Queued, the app would say "removed"
// while the record stayed, and the delete would run later from a stale phone, after others
// may have recorded milk, deliveries or stock against it. Edits to these records still queue.
const ONLINE_ONLY_DELETES = [
  /^\/herd\/[^/]+$/,
  /^\/(?:finance\/)?customers\/[^/]+$/,
  /^\/inventory\/items\/[^/]+$/,
];

/** The toast after a change is saved on the phone to send later, in the current language. */
export function queuedOfflineMessage() {
  return errorsCopy.offline.queued;
}

export function isReplayableMutation(config) {
  if (config.skipOfflineQueue || config.offline === 'never') return false;
  if (config.offline === 'queue') return true;

  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return false;
  const url = config.url || '';
  if (method === 'delete' && ONLINE_ONLY_DELETES.some((pattern) => pattern.test(url))) return false;
  return !ONLINE_ONLY_PATHS.some((pattern) => pattern.test(url));
}

// apiClient answers a replayable write made without a connection with a stand-in
// `{ queued: true, offline: true }` body instead of the saved record.
export function isQueuedOffline(result) {
  return Boolean(result?.queued && result?.offline);
}

/**
 * For online-only actions (payments, payroll, corrections): when the request never reached the
 * server, say plainly that nothing happened, so a farmer doesn't assume staff were paid.
 * Returns null when the server did answer, so callers fall back to the server's message.
 */
export function offlineFailureMessage(error, whatDidNotHappen) {
  if (error?.response) return null;
  return errorsCopy.offline.failed(whatDidNotHappen);
}
