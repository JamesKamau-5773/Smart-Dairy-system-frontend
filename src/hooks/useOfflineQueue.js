import { useEffect, useState } from 'react';
import offlineQueue from '../lib/offlineQueue';

/** Live connection state plus the current user's queued (unsent) changes. */
export function useOfflineQueue() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [entries, setEntries] = useState([]);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      offlineQueue.getAll()
        .then((items) => { if (active) setEntries(items); })
        .catch(() => { if (active) setEntries([]); });
    };
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    const onFlushing = (event) => setFlushing(Boolean(event?.detail));

    refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offlineQueue:updated', refresh);
    window.addEventListener('offlineQueue:flushing', onFlushing);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offlineQueue:updated', refresh);
      window.removeEventListener('offlineQueue:flushing', onFlushing);
    };
  }, []);

  const needsAttention = entries.filter((entry) => entry.status === 'NEEDS_ATTENTION');
  return { online, entries, flushing, pendingCount: entries.length, needsAttentionCount: needsAttention.length };
}
