import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { normalizeSemenInventory } from '../../../lib/breedingUtils';
import { createAuditEntry, logToAuditTrail } from '../../../lib/audit';
import { breedingApi } from '../../../lib/backendApi';

/**
 * RestockSemenInventoryForm
 * 
 * Form for restocking existing semen inventory items.
 * Handles:
 * - Adding quantity to existing stock
 * - Form validation
 * - Audit logging
 */
export default function RestockSemenInventoryForm({
  inventoryItem,
  onSuccess,
  onError,
  isSaving = false,
  onSavingChange,
}) {
  const [restockForm, setRestockForm] = useState({ amount: '' });
  const [formErrors, setFormErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormErrors({});

    const amount = Number(restockForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormErrors((current) => ({ ...current, restockAmount: 'Enter a quantity greater than 0.' }));
      return;
    }

    if (!inventoryItem) {
      const errorMsg = 'Select an inventory item before restocking.';
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      onSavingChange?.(true);

      const nextStrawCount = Number(inventoryItem.strawsLeft || 0) + amount;
      const payload = {
        name: inventoryItem.name,
        code: inventoryItem.code,
        improves: inventoryItem.improves,
        strawsLeft: nextStrawCount,
      };

      const response = await breedingApi.updateSemenInventory(inventoryItem.id, payload);
      const updated = normalizeSemenInventory({
        ...inventoryItem,
        ...payload,
        ...response,
        strawsLeft: nextStrawCount,
      });

      logToAuditTrail(
        createAuditEntry({
          action: 'update',
          recordType: 'semen_inventory',
          recordId: updated.id,
          userName: 'You',
          notes: `Restocked ${updated.name} (${updated.code}) by ${amount} straws`,
        })
      );

      const successMsg = `Restocked ${updated.name} by ${amount} straws.`;
      onSuccess?.(updated, successMsg);
      toast.success(successMsg);

      // Reset form
      setRestockForm({ amount: '' });
    } catch (error) {
      console.error('Error restocking inventory:', error);
      const errorMsg = error?.response?.data?.error || 'Failed to restock semen inventory. Please try again.';
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="border-b border-ink/10 pb-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-brand">Restock Details</h4>
        </div>

        {/* Selected Item Info */}
        <div className="rounded-lg border border-brand/10 bg-brand/5 p-3 text-sm text-ink-strong">
          <div className="font-bold">{inventoryItem?.name || 'Selected Item'}</div>
          <div className="text-xs text-ink-muted">Code: {inventoryItem?.code || 'N/A'}</div>
          <div className="text-xs text-ink-muted">
            Current stock: {inventoryItem?.strawsLeft ?? 0} straws
          </div>
        </div>

        {/* Add Straws */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
            Add Straws *
          </label>
          <input
            type="number"
            min="1"
            className={`input-machined w-full ${
              formErrors.restockAmount ? 'border-rose-300 bg-rose-50' : ''
            }`}
            value={restockForm.amount}
            onChange={(event) => {
              setRestockForm({ amount: event.target.value });
              if (formErrors.restockAmount) {
                setFormErrors((current) => ({ ...current, restockAmount: null }));
              }
            }}
            placeholder="e.g. 20"
            aria-invalid={!!formErrors.restockAmount}
          />
          {formErrors.restockAmount && (
            <p className="mt-1 text-xs text-rose-600">{formErrors.restockAmount}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-command px-4 py-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Restock'}
        </button>
      </div>
    </form>
  );
}
