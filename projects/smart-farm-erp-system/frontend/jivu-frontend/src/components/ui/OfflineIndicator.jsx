import React, { useEffect, useState } from 'react';
import { Dot, Database, Loader2 } from 'lucide-react';
import offlineQueue from '../../lib/offlineQueue';

export default function OfflineIndicator({ onOpenInspector } = {}) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refresh = async () => {
    try {
      const all = await offlineQueue.getAll();
      setPending(all.length);
    } catch (e) {
      setPending(0);
    }
  };

  useEffect(() => {
    refresh();
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    const onUpdated = () => refresh();
    const onFlushing = (e) => setFlushing(!!e?.detail);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offlineQueue:updated', onUpdated);
    window.addEventListener('offlineQueue:flushing', onFlushing);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offlineQueue:updated', onUpdated);
      window.removeEventListener('offlineQueue:flushing', onFlushing);
    };
  }, []);

  return (
    <button
      onClick={onOpenInspector}
      className="flex items-center gap-2 px-3 py-1 rounded-md border border-ink/10 bg-surface/80 text-sm font-medium"
      title={online ? 'Online' : 'Offline'}
    >
      <Dot size={12} className={online ? 'text-success' : 'text-danger'} />
      <span className="opacity-80">{online ? 'Online' : 'Offline'}</span>
      <Database size={14} className="ml-2 text-ink-muted" />
      <span className="text-xs text-ink-muted">{pending}</span>
      {flushing ? (
        <Loader2 size={14} className="ml-2 text-ink-muted animate-spin" />
      ) : null}
    </button>
  );
}
