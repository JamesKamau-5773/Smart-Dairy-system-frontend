/**
 * Collapses a React Query result into the state a list screen should show:
 * - loading: first fetch in flight, nothing cached
 * - offline: first fetch paused because there is no connection, nothing cached
 * - error:   fetch failed and there is nothing cached to show
 * - stale:   fetch failed but cached rows are still available
 * - ready:   data available (may be an empty list)
 */
export function getListLoadState({ status, fetchStatus, data }) {
  if (status === 'pending') return fetchStatus === 'paused' ? 'offline' : 'loading';
  if (status === 'error') return data === undefined ? 'error' : 'stale';
  return 'ready';
}
