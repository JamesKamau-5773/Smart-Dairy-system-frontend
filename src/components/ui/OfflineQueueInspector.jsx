import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import offlineQueue from '../../lib/offlineQueue';

export default function OfflineQueueInspector({ isOpen, onClose } = {}) {
  const [items, setItems] = useState([]);
  const [working, setWorking] = useState(false);

  const load = async () => {
    const all = await offlineQueue.getAll();
    setItems(all.reverse());
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Offline Queue">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">Pending offline saves queued on this device.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.length === 0 && <div className="text-sm text-ink-muted">No pending items.</div>}
          {items.map((it) => (
            <div key={it.id} className="p-3 rounded-lg bg-surface border border-ink/10 flex justify-between items-start">
              <div className="text-sm">
                <div className="font-bold">{it.item?.cowId || 'entry'}</div>
                <div className="text-xs text-ink-muted">{new Date(it.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRemove(it.id)} className="text-sm text-danger">Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-command bg-surface-raised text-ink">Close</button>
          <button onClick={handleFlush} disabled={working || items.length===0} className="btn-command bg-brand text-surface">{working ? 'Flushing…' : 'Flush Now'}</button>
        </div>
      </div>
    </Modal>
  );
}
