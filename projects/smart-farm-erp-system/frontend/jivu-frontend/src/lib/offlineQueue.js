// Offline queue supporting localforage (preferred), IndexedDB fallback, and in-memory fallback.
import apiClient from './apiClient';
import { buildProductionYieldPayload } from './backendApi';

let backend = null; // { type: 'localforage'|'idb'|'memory', lib? }
let memoryQueue = [];

const DB_NAME = 'jivu_offline_queue_db';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

async function initBackend() {
  if (backend) return backend;

  try {
    const lf = await import('localforage');
    const lib = lf.default ?? lf;
    lib.config && lib.config({ name: 'jivu', storeName: 'offline_queue' });
    backend = { type: 'localforage', lib };
    return backend;
  } catch (e) {
    // ignore
  }

  if (typeof indexedDB !== 'undefined') {
    backend = { type: 'idb' };
    return backend;
  }

  backend = { type: 'memory' };
  return backend;
}

function idForNow() {
  return `oq_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(item) {
  const b = await initBackend();
  if (b.type === 'localforage') {
    const lf = b.lib;
    const id = idForNow();
    const entry = { id, item, createdAt: new Date().toISOString() };
    const arr = (await lf.getItem('queue')) || [];
    arr.push(entry);
    await lf.setItem('queue', arr);
    dispatchEvent(new CustomEvent('offlineQueue:updated'));
    return id;
  }

  if (b.type === 'idb') {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry = { id: idForNow(), item, createdAt: new Date().toISOString() };
      const req = store.add(entry);
      req.onsuccess = () => {
        dispatchEvent(new CustomEvent('offlineQueue:updated'));
        resolve(entry.id);
      };
      req.onerror = () => reject(req.error);
    });
  }

  const entry = { id: idForNow(), item, createdAt: new Date().toISOString() };
  memoryQueue.push(entry);
  dispatchEvent(new CustomEvent('offlineQueue:updated'));
  return entry.id;
}

async function getAll() {
  const b = await initBackend();
  if (b.type === 'localforage') {
    return (await b.lib.getItem('queue')) || [];
  }
  if (b.type === 'idb') {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  return memoryQueue.slice();
}

async function remove(id) {
  const b = await initBackend();
  if (b.type === 'localforage') {
    const lf = b.lib;
    const arr = (await lf.getItem('queue')) || [];
    const remaining = arr.filter((e) => e.id !== id);
    await lf.setItem('queue', remaining);
    dispatchEvent(new CustomEvent('offlineQueue:updated'));
    return true;
  }
  if (b.type === 'idb') {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        dispatchEvent(new CustomEvent('offlineQueue:updated'));
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  }
  memoryQueue = memoryQueue.filter((e) => e.id !== id);
  dispatchEvent(new CustomEvent('offlineQueue:updated'));
  return true;
}

async function flush() {
  dispatchEvent(new CustomEvent('offlineQueue:flushing', { detail: true }));
  const entries = await getAll();
  if (!entries.length) {
    dispatchEvent(new CustomEvent('offlineQueue:flushing', { detail: false }));
    return;
  }

  for (const entry of entries) {
    try {
      const payload = buildProductionYieldPayload(entry.item);
      const date = payload.milkingDate || new Date().toISOString().slice(0, 10);
      const idempotencyKey = `fastlog:${payload.cow_id}:${date}:${payload.session}`;
      const res = await apiClient.post('/production/yield', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
      if (res?.data) {
        await remove(entry.id);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        // Duplicate on server — remove locally
        await remove(entry.id);
        continue;
      }
      console.warn('offlineQueue: flush failed for', entry.id, err?.message || err);
      // keep for later
    }
  }

  dispatchEvent(new CustomEvent('offlineQueue:flushing', { detail: false }));
}

export default {
  enqueue,
  getAll,
  remove,
  flush,
};
