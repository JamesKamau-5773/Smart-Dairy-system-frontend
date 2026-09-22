import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw, Trash2 } from 'lucide-react';
import Modal from './Modal';
import offlineQueue from '../../lib/offlineQueue';

function operationLabel(item) {
  return `${item.request.method} ${item.request.url}`;
}

export default function OfflineQueueInspector({ isOpen, onClose } = {}) {
  const [items, setItems] = useState([]);
  const [working, setWorking] = useState(false);

  const load = async () => {
    const all = await offlineQueue.getAll();
    setItems(all.reverse());
  };

  useEffect(() => {
    let active = true;
    if (isOpen) {
      offlineQueue.getAll().then((all) => {
        if (active) setItems(all.reverse());
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleFlush = async () => {
    setWorking(true);
    try {
      await offlineQueue.flush();
      await load();
    } finally { setWorking(false); }
  };

  const handleRemove = async (id) => {
    await offlineQueue.remove(id);
    await load();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Synchronization">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">Changes saved on this device synchronize automatically when connectivity returns.</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {items.length === 0 && <div className="text-sm text-ink-muted">All changes are synchronized.</div>}
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink/10 bg-surface p-3">
              <div className="min-w-0 text-sm">
                <div className="flex items-center gap-2 font-bold text-ink-900">
                  {item.status === 'NEEDS_ATTENTION'
                    ? <AlertTriangle size={16} className="shrink-0 text-warning-700" />
                    : <Clock3 size={16} className="shrink-0 text-ink-500" />}
                  <span className="truncate">{operationLabel(item)}</span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">{new Date(item.createdAt).toLocaleString()}</div>
                {item.lastError ? (
                  <p className="mt-2 text-xs text-danger-800">{item.lastError.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="btn-ghost h-9 w-9 shrink-0 !p-0 text-danger-800"
                aria-label={`Remove ${operationLabel(item)}`}
                title="Remove pending change"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handleFlush} disabled={working || items.length === 0} className="btn-command flex items-center gap-2">
            <RefreshCw size={16} className={working ? 'animate-spin' : ''} />
            {working ? 'Synchronizing' : 'Sync now'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
