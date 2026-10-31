const ONLINE_ONLY_PATHS = [
  /^\/auth\//,
  /\/billing\/stk-push$/,
  /\/mpesa\//,
  /\/payments(?:\/|$)/,
  // Payroll runs move money and must not be replayed later from a stale device.
  /^\/hr\/payroll/,
  /\/void-and-replace$/,
  /\/switch-farm$/,
  /\/formulate(?:\/|$)/,
  /\/calculate-(?:nutrition|schedule)(?:\/|$)/,
  /\/calculator(?:\/|$)/,
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
