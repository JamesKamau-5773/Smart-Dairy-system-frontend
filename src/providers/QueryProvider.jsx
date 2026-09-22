/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef } from 'react';
import localforage from 'localforage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useAuth } from '../contexts/AuthContext';
import offlineQueue from '../lib/offlineQueue';

const queryStorage = localforage.createInstance({
  name: 'jivu',
  storeName: 'query_cache',
});

function getCacheNamespace(user) {
  if (!user) return 'anonymous';
  const actorId = user.id ?? user.user_id ?? user.identifier ?? 'unknown-actor';
  const tenantId = user.tenant_id ?? user.cooperative_id ?? 'unknown-tenant';
  const farmId = user.farm_id ?? 'unknown-farm';
  return `${actorId}:${tenantId}:${farmId}`;
}

// Centralized Query Keys mapping
export const QUERY_KEYS = {
  COWS: (tenantId, farmId) => [tenantId, farmId, 'cows'],
  DASHBOARD_SUMMARY: (tenantId, farmId) => [tenantId, farmId, 'dashboard_summary'],
  YIELD_SUMMARY: (tenantId, farmId) => [tenantId, farmId, 'yield_summary'],
  YIELD_TREND: (tenantId, farmId) => [tenantId, farmId, 'yield_trend'],
  MILK_DISPOSITIONS: (tenantId, farmId) => [tenantId, farmId, 'milk_dispositions'],
  UNIT_COST: (tenantId, farmId) => [tenantId, farmId, 'unit_cost'],
  HARDLOCKS: (tenantId, farmId) => [tenantId, farmId, 'hardlocks'],
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      retry: 2,                 
      refetchOnWindowFocus: false, 
    },
  },
});

export function QueryProvider({ children }) {
  const { currentUser } = useAuth();
  const namespace = getCacheNamespace(currentUser);
  const previousNamespace = useRef(namespace);
  const persister = useMemo(() => createAsyncStoragePersister({
    storage: queryStorage,
    key: `rq_cache_v2:${namespace}`,
    throttleTime: 1000,
  }), [namespace]);

  useEffect(() => {
    if (previousNamespace.current !== namespace) {
      queryClient.clear();
      previousNamespace.current = namespace;
    }
  }, [namespace]);

  useEffect(() => {
    // Flush any queued offline writes when back online
    if (typeof indexedDB === 'undefined') return; // test env or old browser — skip

    const onOnline = () => {
      offlineQueue.flush().catch((e) => console.warn('offlineQueue flush failed', e));
    };

    window.addEventListener('online', onOnline);
    // Try a flush on startup as well
    onOnline();

    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: 'jivu-query-cache-v2',
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}