const ONLINE_ONLY_PATHS = [
  /^\/auth\//,
  /\/billing\/stk-push$/,
  /\/mpesa\//,
  /\/payments(?:\/|$)/,
  /\/switch-farm$/,
  /\/formulate(?:\/|$)/,
  /\/calculate-(?:nutrition|schedule)(?:\/|$)/,
  /\/calculator(?:\/|$)/,
];

export function isReplayableMutation(config) {
  if (config.skipOfflineQueue || config.offline === 'never') return false;
  if (config.offline === 'queue') return true;

  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return false;
  return !ONLINE_ONLY_PATHS.some((pattern) => pattern.test(config.url || ''));
}