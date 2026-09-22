import localforage from 'localforage';
import { readActiveSession } from './sessionStore';

const store = localforage.createInstance({
  name: 'jivu',
  storeName: 'offline_mutations',
});

function emitUpdated() {
  window.dispatchEvent(new CustomEvent('offlineQueue:updated'));
}

function activeScope() {
  const session = readActiveSession();
  if (!session) return null;
  return {
    actorId: String(session.id ?? session.user_id ?? session.identifier ?? ''),
    tenantId: String(session.tenant_id ?? session.cooperative_id ?? ''),
    farmId: String(session.farm_id ?? ''),
  };
}

function matchesScope(entry, scope) {
  return Boolean(scope)
    && entry.scope.actorId === scope.actorId
    && entry.scope.tenantId === scope.tenantId
    && entry.scope.farmId === scope.farmId;
}

function createId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `oq_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export function isSerializablePayload(data) {
  if (data instanceof FormData || data instanceof Blob || data instanceof ArrayBuffer) return false;
  try {
    JSON.stringify(data ?? null);
    return true;
  } catch {
    return false;
  }
}

export async function enqueueRequest({ method, url, data, headers = {} }) {
  const scope = activeScope();
  if (!scope?.actorId || !scope?.tenantId) {
    throw new Error('An authenticated offline session is required.');
  }
  if (!isSerializablePayload(data)) {
    throw new Error('This request contains data that cannot be stored offline.');
  }

  const id = createId();
  const idempotencyKey = headers['Idempotency-Key'] ?? `offline:${scope.actorId}:${id}`;
  const entry = {
    id,
    version: 2,
    scope,
    request: {
      method: method.toUpperCase(),
      url,
      data: data ?? null,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
    status: 'PENDING',
    attempts: 0,
    createdAt: new Date().toISOString(),
    nextAttemptAt: null,
    lastError: null,
  };
  await store.setItem(id, entry);
  emitUpdated();
  return entry;
}

export async function getAll({ allScopes = false } = {}) {
  const entries = [];
  const scope = activeScope();
  await store.iterate((entry) => {
    if (allScopes || matchesScope(entry, scope)) entries.push(entry);
  });
  return entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function update(entry) {
  await store.setItem(entry.id, entry);
  emitUpdated();
  return entry;
}

export async function remove(id) {
  await store.removeItem(id);
  emitUpdated();
}

export async function clearCurrentScope() {
  const entries = await getAll();
  await Promise.all(entries.map((entry) => store.removeItem(entry.id)));
  emitUpdated();
}