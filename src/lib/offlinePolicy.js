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

export const QUEUED_OFFLINE_MESSAGE = 'Saved on this phone. It will be sent when you’re back online.';

export function isReplayableMutation(config) {
  if (config.skipOfflineQueue || config.offline === 'never') return false;
  if (config.offline === 'queue') return true;

  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return false;
  return !ONLINE_ONLY_PATHS.some((pattern) => pattern.test(config.url || ''));
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
  return `No internet connection. ${whatDidNotHappen} Try again when you’re back online.`;
}
