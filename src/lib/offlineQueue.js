import apiClient, { createIdempotencyKey } from './apiClient';
import { buildProductionYieldPayload, getApiErrorMessage } from './backendApi';
import { enqueueRequest, getAll, remove, update } from './offlineMutationStore';

const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

function emitFlushing(value) {
  window.dispatchEvent(new CustomEvent('offlineQueue:flushing', { detail: value }));
}

function retryDelay(attempts) {
  return Math.min(BASE_RETRY_DELAY_MS * (2 ** Math.max(attempts - 1, 0)), MAX_RETRY_DELAY_MS);
}

async function enqueue(item) {
  const payload = buildProductionYieldPayload(item);
  const entry = await enqueueRequest({
    method: 'POST',
    url: '/production/yield',
    data: payload,
    // The stored request keeps this key for retries, but every new queued log
    // gets its own key even when cow/date/session are the same.
    headers: { 'Idempotency-Key': createIdempotencyKey() },
  });
  return entry.id;
}

async function markFailure(entry, error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const attempts = entry.attempts + 1;
  const isRetryable = !status || status >= 500 || code === 'IDEMPOTENCY_IN_PROGRESS';
  await update({
    ...entry,
    attempts,
    status: isRetryable ? 'PENDING' : 'NEEDS_ATTENTION',
    nextAttemptAt: isRetryable
      ? new Date(Date.now() + retryDelay(attempts)).toISOString()
      : null,
    lastError: {
      status: status ?? null,
      code: code ?? null,
      message: getApiErrorMessage(error, 'Could not sync this change. Tap “Sync now” to retry.'),
      occurredAt: new Date().toISOString(),
    },
  });
}

let activeFlush = null;

// Online events, the retry timer and "Sync now" can all ask for a flush at once;
// share one run so the same entry is never sent twice in parallel.
function flush() {
  activeFlush ??= runFlush().finally(() => { activeFlush = null; });
  return activeFlush;
}

const isDue = (entry) => entry.status !== 'NEEDS_ATTENTION'
  && !(entry.nextAttemptAt && Date.parse(entry.nextAttemptAt) > Date.now());

async function runFlush() {
  const entries = await getAll();
  if (!navigator.onLine || !entries.some(isDue)) return { synced: 0, pending: entries.length };
  emitFlushing(true);
  let synced = 0;
  try {
    for (const entry of entries) {
      if (!isDue(entry)) continue;
      try {
        await apiClient.request({ ...entry.request, skipOfflineQueue: true });
        await remove(entry.id);
        synced += 1;
      } catch (error) {
        await markFailure(entry, error);
        if (!error?.response) break;
      }
    }
    return { synced, pending: (await getAll()).length };
  } finally {
    emitFlushing(false);
  }
}

export default {
  enqueue,
  enqueueRequest,
  getAll,
  remove,
  flush,
};
