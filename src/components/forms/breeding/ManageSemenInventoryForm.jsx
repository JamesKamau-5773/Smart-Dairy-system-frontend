import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../../lib/validation';
import { normalizeSemenInventory } from '../../../lib/breedingUtils';
import { createAuditEntry, logToAuditTrail } from '../../../lib/audit';
import { breedingApi } from '../../../lib/backendApi';

/**
 * ManageSemenInventoryForm
 * 
 * Form for adding new semen inventory items.
 * Handles:
 * - Bull name, code, straws, breed improvement tracking
 * - Form validation
 * - Audit logging
 */
export default function ManageSemenInventoryForm({
  onSuccess,
  onError,
  isSaving = false,
  onSavingChange,
  initialData = {},
}) {
  const [inventoryForm, setInventoryForm] = useState({
    name: initialData.name || '',
    code: initialData.code || '',
    strawsLeft: initialData.strawsLeft || '',
    improves: initialData.improves || '',
  });
  const [formErrors, setFormErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormErrors({});

    // Validate
    const validationSchema = {
      name: [ValidationRules.required],
      code: [ValidationRules.required],
      strawsLeft: [ValidationRules.required, ValidationRules.positiveNumber],
      improves: [ValidationRules.required],
    };

    const errors = validateForm(inventoryForm, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const errorMsg = getFirstErrorMessage(errors);
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      onSavingChange?.(true);

      const inventoryPayload = {
        bull_name: inventoryForm.name.trim(),
        straw_code: String(inventoryForm.code)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '-')
          .replace(/[^A-Z0-9-]/g, ''),
        breed: inventoryForm.improves.trim(),
        strawsLeft: Number(inventoryForm.strawsLeft) || 0,
        name: inventoryForm.name.trim(),
        code: inventoryForm.code.trim(),
        improves: inventoryForm.improves.trim(),
      };

      const createdInventory = await breedingApi.createSemenInventory(inventoryPayload);
      const nextInventory = normalizeSemenInventory({
        ...inventoryPayload,
        ...createdInventory,
        improves: createdInventory?.improves
          ?? createdInventory?.breed
          ?? createdInventory?.breed_improvement
          ?? inventoryPayload.improves,
      });

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'semen_inventory',
          recordId: nextInventory.id,
          userName: 'You',
          notes: `Added ${nextInventory.name} (${nextInventory.code}) - ${nextInventory.strawsLeft} straws`,
        })
      );

      const successMsg = `Added ${nextInventory.name} to inventory.`;
      onSuccess?.(nextInventory, successMsg);
      toast.success(successMsg);

      // Reset form
      setInventoryForm({
        name: '',
        code: '',
        strawsLeft: '',
        improves: '',
      });
    } catch (error) {
      console.error('Error adding inventory:', error);
      const errorMsg = error?.response?.data?.error || 'Failed to add inventory. Please try again.';
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
          <h4 className="text-sm font-bold uppercase tracking-widest text-brand">Inventory Item</h4>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Name *</label>
          <input
            className={`input-machined w-full ${formErrors.name ? 'border-rose-300 bg-rose-50' : ''}`}
            value={inventoryForm.name}
            onChange={(event) => {
              setInventoryForm((current) => ({ ...current, name: event.target.value }));
              if (formErrors.name) setFormErrors({ ...formErrors, name: null });
            }}
            placeholder="e.g. Jersey Bull"
            aria-invalid={!!formErrors.name}
          />
          {formErrors.name && <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>}
        </div>

        {/* Code & Straws */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Code *</label>
            <input
              className={`input-machined w-full ${formErrors.code ? 'border-rose-300 bg-rose-50' : ''}`}
              value={inventoryForm.code}
              onChange={(event) => {
                setInventoryForm((current) => ({ ...current, code: event.target.value }));
                if (formErrors.code) setFormErrors({ ...formErrors, code: null });
              }}
              placeholder="e.g. JY-312"
              aria-invalid={!!formErrors.code}
            />
            {formErrors.code && <p className="mt-1 text-xs text-rose-600">{formErrors.code}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Straws Left *</label>
            <input
              type="number"
              min="0"
              className={`input-machined w-full ${formErrors.strawsLeft ? 'border-rose-300 bg-rose-50' : ''}`}
              value={inventoryForm.strawsLeft}
              onChange={(event) => {
                setInventoryForm((current) => ({ ...current, strawsLeft: event.target.value }));
                if (formErrors.strawsLeft) setFormErrors({ ...formErrors, strawsLeft: null });
              }}
              placeholder="e.g. 6"
              aria-invalid={!!formErrors.strawsLeft}
            />
            {formErrors.strawsLeft && <p className="mt-1 text-xs text-rose-600">{formErrors.strawsLeft}</p>}
          </div>
        </div>

        {/* Breed Improvement */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Breed Improvement *</label>
          <input
            className={`input-machined w-full ${formErrors.improves ? 'border-rose-300 bg-rose-50' : ''}`}
            value={inventoryForm.improves}
            onChange={(event) => {
              setInventoryForm((current) => ({ ...current, improves: event.target.value }));
              if (formErrors.improves) setFormErrors({ ...formErrors, improves: null });
            }}
            placeholder="e.g. Friesian"
            aria-invalid={!!formErrors.improves}
          />
          {formErrors.improves && <p className="mt-1 text-xs text-rose-600">{formErrors.improves}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-command px-4 py-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Add Inventory'}
        </button>
      </div>
    </form>
  );
}
