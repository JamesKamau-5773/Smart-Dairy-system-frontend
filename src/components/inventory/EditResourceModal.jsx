import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Edit2 } from 'lucide-react';
import { resolveIngredientStandards } from '../../lib/feedNutritionStandards';
import { proteinGramsPerKgToInput, proteinInputToGramsPerKg } from '../../lib/feedNutritionUnits';

export default function EditResourceModal({ isOpen, onClose, item, onSave }) {
  const initialStandards = resolveIngredientStandards({
    name: item?.name || '',
    category: item?.category || 'Bulk Feed',
  });
  const [defaultSource, setDefaultSource] = useState(initialStandards?.source || '');
  const [proteinUnit, setProteinUnit] = useState('percent');
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
    // Pass the merged data back to the parent so the table updates
    onSave({ ...item, ...formData });
    onClose();
  };

  const proteinInputValue = proteinGramsPerKgToInput(formData.proteinGramsPerKg, proteinUnit);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink-strong/30 p-3 backdrop-blur-sm animate-in fade-in duration-200 touch-pan-y sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-label="Edit resource" className="my-auto flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 py-4 border-b border-slate-100 bg-slate-50 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="bg-slate-200 p-2 rounded-lg text-slate-600">
              <Edit2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-ink text-sm uppercase tracking-widest">Edit Resource</h3>
              <p className="text-[10px] font-bold text-ink-muted uppercase mt-0.5">Modify Definition</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-6">

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Resource Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">SKU / Code</label>
                <input
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white"
                >
                  <option value="Bulk Feed">Bulk Feed</option>
                  <option value="Medical Vault">Medical Vault</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Re-order Level</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value, 10) || 0})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest">Crude Protein</label>
                  <select value={proteinUnit} onChange={(e) => setProteinUnit(e.target.value)} className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold">
                    <option value="percent">%</option>
                    <option value="g_per_kg">g/kg</option>
                  </select>
                </div>
                <input
                  type="number"
                  min="0"
                  max={proteinUnit === 'percent' ? 100 : 1000}
                  step="0.1"
                  value={proteinInputValue}
                  onChange={(e) => setFormData({ ...formData, proteinGramsPerKg: proteinInputToGramsPerKg(e.target.value, proteinUnit) })}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {proteinUnit === 'percent'
                    ? `${proteinInputValue}% = ${Number(formData.proteinGramsPerKg).toFixed(1)} g/kg`
                    : `${proteinInputValue} g/kg = ${(Number(formData.proteinGramsPerKg) / 10).toFixed(1)}%`}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Energy (MJ/kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.energyMjPerKg}
                  onChange={(e) => setFormData({ ...formData, energyMjPerKg: Number(e.target.value) || 0 })}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Fiber (g/kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.fiberGramsPerKg}
                  onChange={(e) => setFormData({ ...formData, fiberGramsPerKg: Number(e.target.value) || 0 })}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Cost (KES/kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.costPerKg}
                  onChange={(e) => setFormData({ ...formData, costPerKg: Number(e.target.value) || 0 })}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
            </div>

            {defaultSource && (
              <p className="text-[10px] text-slate-500 font-semibold">
                Defaults applied from {defaultSource.startsWith('ingredient:') ? 'ingredient standard' : 'category baseline'} ({defaultSource.replace('ingredient:', '').replace('category:', '')}).
              </p>
            )}

            {/* Note about stock */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
              <p className="text-xs font-bold text-blue-800">
                Note: To adjust actual physical stock quantities, please use the <span className="font-black">Restock</span> or <span className="font-black">Adjust</span> actions. This form only modifies the item's master definition.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:gap-4 sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 px-6 rounded-lg font-black text-xs uppercase tracking-widest bg-ink text-white hover:bg-ink-strong transition-all  flex items-center justify-center gap-2"
            >
              <Save size={16} strokeWidth={3} /> Save Changes
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
