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

/**
 * True when the backend's rows are available to show: freshly loaded (`ready`) or saved on
 * this phone after a failed refresh (`stale`). An empty state may only show when this is
 * true and the list is empty; loading and errors are never "empty".
 */
export const hasRowsToShow = (state) => state === 'ready' || state === 'stale';
