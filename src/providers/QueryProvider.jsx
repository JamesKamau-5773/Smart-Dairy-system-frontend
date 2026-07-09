/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import offlineQueue from '../lib/offlineQueue';

function getCacheNamespace() {
  try {
    const sessionStr = sessionStorage.getItem('jivu_user');
    if (!sessionStr) {
      return 'anonymous';
    }

    const session = JSON.parse(sessionStr);
    const tenantId = session?.tenant_id ?? session?.cooperative_id ?? 'unknown-tenant';
    const farmId = session?.farm_id ?? 'unknown-farm';
    return `${tenantId}:${farmId}`;
  } catch {
    return 'anonymous';
  }
}

// Centralized Query Keys mapping
export const QUERY_KEYS = {
  COWS: (tenantId, farmId) => [tenantId, farmId, 'cows'],
  DASHBOARD_SUMMARY: (tenantId, farmId) => [tenantId, farmId, 'dashboard_summary'],
  YIELD_SUMMARY: (tenantId, farmId) => [tenantId, farmId, 'yield_summary'],
  YIELD_TREND: (tenantId, farmId) => [tenantId, farmId, 'yield_trend'],
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
  React.useEffect(() => {
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
  
  React.useEffect(() => {
    // Basic React Query cache persistence (small & best-effort).
    const STORAGE_PREFIX = 'rq_cache_v1';
    const STORAGE = `${STORAGE_PREFIX}:${getCacheNamespace()}`;

    // Restore cached queries on startup
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach((k) => {
          try {
            const key = JSON.parse(k);
            queryClient.setQueryData(key, parsed[k].data);
          } catch (e) {
            // ignore invalid entries
          }
        });
      }
    } catch (e) {
      console.warn('QueryProvider: failed to restore cache', e);
    }

    // Subscribe to query cache changes and persist when data changes
    const save = () => {
      try {
        const out = {};
        const all = queryClient.getQueryCache().getAll();
        all.forEach((q) => {
          const k = JSON.stringify(q.queryKey);
          if (q.state?.data !== undefined) {
            out[k] = { data: q.state.data, updatedAt: q.state.dataUpdatedAt };
          }
        });
        localStorage.setItem(STORAGE, JSON.stringify(out));
      } catch (e) {
        console.warn('QueryProvider: failed to save cache', e);
      }
    };

    const unsub = queryClient.getQueryCache().subscribe(save);
    // also save before unload
    window.addEventListener('beforeunload', save);

    return () => {
      unsub();
      window.removeEventListener('beforeunload', save);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}