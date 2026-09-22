import apiClient, { createIdempotencyKey } from './apiClient';
import { buildProductionYieldPayload } from './backendApi';
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
      message: error?.response?.data?.message ?? error?.message ?? 'Synchronization failed.',
      occurredAt: new Date().toISOString(),
    },
  });
}

async function flush() {
  if (!navigator.onLine) return { synced: 0, pending: (await getAll()).length };
  emitFlushing(true);
  let synced = 0;
  try {
    const entries = await getAll();
    for (const entry of entries) {
      if (entry.status === 'NEEDS_ATTENTION') continue;
      if (entry.nextAttemptAt && Date.parse(entry.nextAttemptAt) > Date.now()) continue;
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
