import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import offlineQueue from '../../lib/offlineQueue';

export default function OfflineIndicator({ onOpenInspector } = {}) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refresh = async () => {
    try {
      const all = await offlineQueue.getAll();
      setPending(all.length);
    } catch {
      setPending(0);
    }
  };

  useEffect(() => {
    let active = true;
    offlineQueue.getAll()
      .then((items) => {
        if (active) setPending(items.length);
      })
      .catch(() => {
        if (active) setPending(0);
      });
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    const onUpdated = () => refresh();
    const onFlushing = (e) => setFlushing(!!e?.detail);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offlineQueue:updated', onUpdated);
    window.addEventListener('offlineQueue:flushing', onFlushing);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offlineQueue:updated', onUpdated);
      window.removeEventListener('offlineQueue:flushing', onFlushing);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpenInspector}
      className="flex h-10 items-center gap-2 rounded-button border border-brand/20 bg-surface px-3 text-sm font-semibold text-ink hover:border-brand hover:bg-brand-50"
      title="Open synchronization status"
      aria-label={`${online ? 'Online' : 'Offline'}, ${pending} pending changes`}
    >
      {online ? <Cloud size={17} className="text-brand" /> : <CloudOff size={17} className="text-brand-dark" />}
      <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
      {pending > 0 ? (
        <span className="min-w-5 rounded-full bg-brand-50 px-1.5 py-0.5 text-center text-xs font-bold text-brand-dark">
          {pending}
        </span>
      ) : null}
      {flushing ? (
        <Loader2 size={14} className="animate-spin text-brand" />
      ) : null}
    </button>
  );
}
