import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import { resolveIngredientStandards } from '../../lib/feedNutritionStandards';
import { proteinGramsPerKgToInput, proteinInputToGramsPerKg } from '../../lib/feedNutritionUnits';
import { validateInventoryItem } from '../../lib/inventoryItemRules';
import { feedCopy } from '../../i18n/feed';

export default function EditResourceModal({ isOpen, onClose, item, onSave }) {
  const initialStandards = resolveIngredientStandards({
    name: item?.name || '',
    category: item?.category || 'Bulk Feed',
  });
  const [defaultSource, setDefaultSource] = useState(initialStandards?.source || '');
  const [proteinUnit, setProteinUnit] = useState('percent');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || 'Bulk Feed',
    reorderLevel: item?.reorderLevel ?? 0,
    proteinGramsPerKg: item?.protein_grams_per_kg ?? item?.proteinGramsPerKg ?? initialStandards?.values?.proteinGramsPerKg ?? 0,
    energyMjPerKg: item?.energy_mj_per_kg ?? item?.energyMjPerKg ?? initialStandards?.values?.energyMjPerKg ?? 0,
    fiberGramsPerKg: item?.fiber_grams_per_kg ?? item?.fiberGramsPerKg ?? initialStandards?.values?.fiberGramsPerKg ?? 0,
    costPerKg: item?.cost_per_kg ?? item?.costPerKg ?? initialStandards?.values?.costPerKg ?? 0,
  });

  const handleFieldChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'name' || name === 'category') {
        const standards = resolveIngredientStandards({
          name: name === 'name' ? value : next.name,
          category: name === 'category' ? value : next.category,
        });

        if (standards) {
          next.proteinGramsPerKg = standards.values.proteinGramsPerKg;
          next.energyMjPerKg = standards.values.energyMjPerKg;
          next.fiberGramsPerKg = standards.values.fiberGramsPerKg;
          next.costPerKg = standards.values.costPerKg;
          setDefaultSource(standards.source);
        } else {
          setDefaultSource('');
        }
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateInventoryItem(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    // The definition only: the API layer leaves stock out of updates.
    onSave({ ...item, ...formData });
    onClose();
  };

  const proteinInputValue = proteinGramsPerKgToInput(formData.proteinGramsPerKg, proteinUnit);

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={feedCopy.inventory.form.editTitle}
      subtitle={feedCopy.inventory.form.editSubtitle}
      size="lg"
      onSubmit={handleSubmit}
      footerActions={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-control text-slate-500 hover:bg-slate-200 hover:text-ink transition-colors"
          >
            {feedCopy.inventory.form.cancel}
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 px-6 rounded-lg text-control bg-ink text-white hover:bg-ink-strong transition-all flex items-center justify-center gap-2"
          >

        {feedCopy.inventory.form.saveChanges}
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.name}</label>
            <input
              required
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.item.skuOptional}</label>
            <input
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.category}</label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white"
            >
              {Object.entries(feedCopy.inventory.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.reorderLevel}</label>
            <input
              required
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value, 10) || 0})}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-field-label text-ink-muted">{feedCopy.inventory.form.protein}</label>
              <select value={proteinUnit} onChange={(e) => setProteinUnit(e.target.value)} className="rounded border border-slate-200 bg-white px-2 py-1 text-control">
                <option value="percent">%</option>
                <option value="g_per_kg">g/kg</option>
              </select>
            </div>
            <input
              type="number"
              min="0"
              max={proteinUnit === 'percent' ? 99.999 : 999.99}
              step="any"
              value={proteinInputValue}
              onChange={(e) => setFormData({ ...formData, proteinGramsPerKg: proteinInputToGramsPerKg(e.target.value, proteinUnit) })}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
            <p className="mt-1 text-meta text-slate-500">
              {proteinUnit === 'percent'
                ? `${proteinInputValue}% = ${Number(formData.proteinGramsPerKg).toFixed(1)} g/kg`
                : `${proteinInputValue} g/kg = ${(Number(formData.proteinGramsPerKg) / 10).toFixed(1)}%`}
            </p>
          </div>
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.energy}</label>
            <input
              type="number"
              min="0"
              step="any"
              max="30"
              value={formData.energyMjPerKg}
              onChange={(e) => setFormData({ ...formData, energyMjPerKg: Number(e.target.value) || 0 })}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.fiber}</label>
            <input
              type="number"
              min="0"
              step="any"
              max="999.99"
              value={formData.fiberGramsPerKg}
              onChange={(e) => setFormData({ ...formData, fiberGramsPerKg: Number(e.target.value) || 0 })}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-field-label text-ink-muted mb-2">{feedCopy.inventory.form.cost}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.costPerKg}
              onChange={(e) => setFormData({ ...formData, costPerKg: Number(e.target.value) || 0 })}
              className="w-full p-3 border border-slate-200 rounded-lg text-control focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        {defaultSource && (
          <p className="text-meta text-slate-500">
            Defaults applied from {defaultSource.startsWith('ingredient:') ? 'ingredient standard' : 'category baseline'} ({defaultSource.replace('ingredient:', '').replace('category:', '')}).
          </p>
        )}

        {Object.keys(errors).length > 0 && (
          <ul role="alert" className="space-y-1 rounded-lg border border-brand-dark/60 bg-brand-100 p-3 text-meta text-ink">
            {Object.entries(errors).map(([field, message]) => <li key={field}>{message}</li>)}
          </ul>
        )}

        {/* Note about stock */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
          <p className="text-meta text-blue-800">
            {feedCopy.inventory.form.stockNoteBefore}<span className="text-body-strong">{feedCopy.inventory.restock}</span>{feedCopy.inventory.form.stockNoteAfter}
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
