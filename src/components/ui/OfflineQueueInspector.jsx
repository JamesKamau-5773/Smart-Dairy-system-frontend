import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw, Trash2 } from 'lucide-react';
import BaseModal from './BaseModal';
import offlineQueue from '../../lib/offlineQueue';
import { commonCopy } from '../../i18n/common';

function operationLabel(item) {
  const path = String(item.request.url || '').toLowerCase();
  const { kinds } = commonCopy.queue;
  if (path.includes('production/yield')) return kinds.milk;
  if (path.includes('inventory')) return kinds.inventory;
  if (path.includes('customer') || path.includes('buyer')) return kinds.customer;
  if (path.includes('payroll') || path.includes('staff')) return kinds.staff;
  if (path.includes('finance') || path.includes('ledger')) return kinds.finance;
  return kinds.other;
}

/** Lists changes saved on this phone that haven't been sent, with Send now and Remove. */
export default function OfflineQueueInspector({ isOpen, onClose } = {}) {
  const [items, setItems] = useState([]);
  const [working, setWorking] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

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
    setConfirmingId(null);
    await offlineQueue.remove(id);
    await load();
  };

  return (
    <BaseModal closeOnBackdrop isOpen={isOpen} onClose={onClose} title={commonCopy.queue.title}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">{commonCopy.queue.intro}</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {items.length === 0 && <div className="text-sm text-ink-muted">{commonCopy.queue.empty}</div>}
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
                  <p className="mt-2 text-xs text-danger-900">
                    {item.status === 'NEEDS_ATTENTION'
                      ? commonCopy.queue.rejected(item.lastError.message)
                      : item.lastError.message}
                  </p>
                ) : null}
              </div>
              {confirmingId === item.id ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
                  <span className="font-semibold text-danger-900">{commonCopy.queue.removeQuestion}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmingId(null)} className="btn-secondary h-8 px-3 text-xs">{commonCopy.queue.keep}</button>
                    <button type="button" onClick={() => handleRemove(item.id)} className="h-8 rounded-button bg-danger-500 px-3 text-xs font-semibold text-white hover:bg-danger-900">{commonCopy.queue.remove}</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(item.id)}
                  className="btn-ghost h-9 w-9 shrink-0 !p-0 text-danger-900"
                  aria-label={commonCopy.queue.removeLabel(operationLabel(item))}
                  title={commonCopy.queue.removeHint}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">{commonCopy.queue.close}</button>
          <button onClick={handleFlush} disabled={working || items.length === 0} className="btn-command flex items-center gap-2">
            <RefreshCw size={16} className={working ? 'animate-spin' : ''} />
            {working ? commonCopy.queue.sending : commonCopy.queue.sendNow}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
