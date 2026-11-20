// src/components/inventory/RegisterResourceModal.jsx
import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import { proteinGramsPerKgToInput, proteinInputToGramsPerKg } from '../../lib/feedNutritionUnits';
import { validateInventoryItem } from '../../lib/inventoryItemRules';
import { feedCopy } from '../../i18n/feed';

const INITIAL_STATE = {
  name: '',
  sku: '',
  category: 'Bulk Feed',
  unit: 'KG',
  currentStock: 0,
  reorderLevel: 10,
  proteinGramsPerKg: 0,
  energyMjPerKg: 0,
  fiberGramsPerKg: 0,
  costPerKg: 0,
};

export default function RegisterResourceModal({ isOpen, onClose, onRegister }) {
  const [formData, setFormData] = useState(INITIAL_STATE); // Initialize with all fields
  const [proteinUnit, setProteinUnit] = useState('percent');
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validate here so an invalid form stays open with what the farmer typed.
  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateInventoryItem(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onRegister(formData);
    onClose();
  };

  if (!isOpen) return null;

  const currentFormData = formData;
  const proteinInputValue = proteinGramsPerKgToInput(currentFormData.proteinGramsPerKg, proteinUnit);

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={feedCopy.inventory.form.registerTitle}
      size="sm"
      closeOnBackdrop
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.name}</label>
            <input required name="name" value={formData.name} onChange={handleChange} placeholder={feedCopy.inventory.form.namePlaceholder} className="input-machined w-full text-control" />
          </div>
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.item.skuOptional}</label>
            <input name="sku" value={formData.sku} onChange={handleChange} placeholder={feedCopy.inventory.form.skuPlaceholder} className="input-machined w-full text-control" />
          </div>
        </div>
        <div>
          <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.category}</label>
          <select name="category" value={formData.category} onChange={handleChange} className="input-machined w-full text-control appearance-none">
            {Object.entries(feedCopy.inventory.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.currentStock}</label>
            <input required name="currentStock" value={formData.currentStock} onChange={handleChange} type="number" min="0" step="any" inputMode="decimal" className="input-machined w-full text-control" />
          </div>
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.unit}</label>
            <input required name="unit" value={formData.unit} onChange={handleChange} placeholder={feedCopy.inventory.form.unitPlaceholder} className="input-machined w-full text-control" />
          </div>
        </div>
        <div>
          <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.reorderLevel}</label>
          <input required name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} type="number" min="0" placeholder={feedCopy.inventory.form.reorderPlaceholder} className="input-machined w-full text-control" />
          <p className="text-meta text-slate-400 mt-1.5">{feedCopy.inventory.form.reorderHint}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-field-label text-ink-muted">{feedCopy.inventory.form.protein}</label>
              <select value={proteinUnit} onChange={(e) => setProteinUnit(e.target.value)} className="input-machined w-auto px-2 py-1.5 text-control">
                <option value="percent">%</option>
                <option value="g_per_kg">g/kg</option>
              </select>
            </div>
            <input
              name="proteinGramsPerKg"
              value={proteinInputValue || ''}
              onChange={(e) => setFormData((previous) => ({ ...previous, proteinGramsPerKg: proteinInputToGramsPerKg(e.target.value, proteinUnit) }))}
              type="number"
              min="0"
              max={proteinUnit === 'percent' ? 99.999 : 999.99}
              step="any"
              className="input-machined w-full text-control"
            />
            <p className="mt-1 text-meta text-slate-500">
              {proteinUnit === 'percent'
                ? `${proteinInputValue}% = ${Number(currentFormData.proteinGramsPerKg || 0).toFixed(1)} g/kg`
                : `${proteinInputValue} g/kg = ${(Number(currentFormData.proteinGramsPerKg || 0) / 10).toFixed(1)}%`}
            </p>
          </div>
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.energy}</label>
            <input name="energyMjPerKg" value={currentFormData.energyMjPerKg || ''} onChange={handleChange} type="number" min="0" max="30" step="any" className="input-machined w-full text-control" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.fiber}</label>
            <input name="fiberGramsPerKg" value={currentFormData.fiberGramsPerKg || ''} onChange={handleChange} type="number" min="0" max="999.99" step="any" className="input-machined w-full text-control" />
          </div>
          <div>
            <label className="text-field-label text-ink-muted mb-1.5 block">{feedCopy.inventory.form.cost}</label>
            <input name="costPerKg" value={currentFormData.costPerKg || ''} onChange={handleChange} type="number" min="0" step="any" className="input-machined w-full text-control" />
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <ul role="alert" className="space-y-1 rounded-[12px] border border-brand-dark/60 bg-brand-100 p-3 text-meta text-ink">
            {Object.entries(errors).map(([field, message]) => <li key={field}>{message}</li>)}
          </ul>
        )}

        <button type="submit" className="w-full py-4 mt-4 bg-brand text-white rounded-[12px] text-control flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors">

          {feedCopy.inventory.form.save}
        </button>
      </form>
    </BaseModal>
  );
}
