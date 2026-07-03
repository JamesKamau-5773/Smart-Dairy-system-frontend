import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';

export default function ReceiveStockModal({ isOpen, onClose, inventoryItems = [], onReceive }) {
  const defaultItemId = inventoryItems[0]?.id || '';
  const [itemId, setItemId] = useState(defaultItemId);
  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === itemId) || inventoryItems[0] || null,
    [inventoryItems, itemId]
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedItem || !quantity) {
      return;
    }

    onReceive?.({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: Number(quantity),
      supplier: supplier.trim(),
      receivedAt: new Date().toISOString(),
    });

    setQuantity('');
    setSupplier('');
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Feed Delivery">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink-muted">Ingredient</label>
          <select className="input-machined w-full" value={itemId} onChange={(event) => setItemId(event.target.value)}>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-ink-muted">Quantity received</label>
          <input
            type="number"
            min="0"
            step="0.1"
            className="input-machined w-full"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="e.g. 250"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-ink-muted">Supplier note</label>
          <input
            type="text"
            className="input-machined w-full"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
            placeholder="Optional supplier or truck note"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-bold text-ink-muted hover:bg-ink/5">
            Cancel
          </button>
          <button type="submit" className="btn-command">
            Save Delivery
          </button>
        </div>
      </form>
    </Modal>
  );
}