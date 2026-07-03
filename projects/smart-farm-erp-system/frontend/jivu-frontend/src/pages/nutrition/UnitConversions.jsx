import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, Info, Plus, Trash2, ArrowRight } from 'lucide-react';
import { nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

/**
 * SRP: Renders the informative banner explaining how the data is stored.
 */
const StorageInfoBanner = () => (
  <div className="bg-brand/5 border border-brand/15 rounded-xl p-4 flex gap-3 shadow-sm mb-6 animate-reveal">
    <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
    <p className="text-sm text-ink-muted leading-relaxed">
      <strong className="text-ink font-bold">Local Storage Notice:</strong> Saved conversions are currently stored locally on this device. They will be applied automatically when showing feed quantities on barn-floor screens.
    </p>
  </div>
);

/**
 * SRP: Handles ONLY the empty state for the conversions list.
 */
const EmptyConversionsState = () => (
  <div className="border border-dashed border-ink/15 bg-surface-warm/30 rounded-xl p-8 flex flex-col items-center justify-center text-center animate-reveal">
    <Scale className="w-8 h-8 text-ink-muted/40 mb-3" />
    <h4 className="text-ink font-bold text-sm mb-1">No local units defined</h4>
    <p className="text-xs text-ink-muted">Add your first custom farm measurement using the form above.</p>
  </div>
);

/**
 * SRP: Handles the display and deletion interaction of a single conversion row.
 */
const ConversionRow = ({ conversion, onRemove }) => {
  if (!conversion) return null;

  const { id, material, localUnit, baseUnit, ratio } = conversion;

  return (
    <div className="flex items-center justify-between p-4 bg-surface-raised border border-ink/5 rounded-xl shadow-sm hover:border-ink/15 transition-colors group">
      <div>
        <p className="text-sm font-bold text-ink mb-0.5">{material}</p>
        <p className="text-xs font-medium text-ink-muted">
          1 {localUnit} = {ratio} {baseUnit}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        aria-label={`Remove ${localUnit} conversion`}
        className="p-2 text-ink-muted/50 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Main Page Component
 */
export default function UnitConversions() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [material, setMaterial] = useState('');
  const [localUnit, setLocalUnit] = useState('');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [ratio, setRatio] = useState('');

  // List State (Loaded from localStorage on mount)
  const [conversions, setConversions] = useState(() => {
    try {
      const saved = localStorage.getItem('jivu_unit_conversions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { data: backendConversions } = useQuery({
    queryKey: ['unit-conversions', tenantId, farmId],
    queryFn: () => nutritionApi.listConversions(),
    enabled: !!tenantId && !!farmId,
  });

  useEffect(() => {
    if (Array.isArray(backendConversions) && backendConversions.length > 0) {
      setConversions(backendConversions);
    }
  }, [backendConversions]);

  const saveConversion = useMutation({
    mutationFn: (payload) => nutritionApi.saveConversion(payload),
    onSuccess: (savedConversion) => {
      setConversions((current) => [...current, savedConversion]);
      queryClient.invalidateQueries({ queryKey: ['unit-conversions', tenantId, farmId] });
      setMaterial('');
      setLocalUnit('');
      setRatio('');
    },
  });

  // Persist to localStorage whenever conversions change
  useEffect(() => {
    localStorage.setItem('jivu_unit_conversions', JSON.stringify(conversions));
  }, [conversions]);

  const handleSave = (e) => {
    e.preventDefault();
    
    // Defensive check
    if (!material.trim() || !localUnit.trim() || !ratio || parseFloat(ratio) <= 0) {
      return;
    }

    saveConversion.mutate({
      material: material.trim(),
      localUnit: localUnit.trim(),
      baseUnit,
      ratio: parseFloat(ratio),
    });
  };

  const handleRemove = (idToRemove) => {
    setConversions((prev) => prev.filter((item) => item?.id !== idToRemove));
  };

  const isFormValid = material.trim() && localUnit.trim() && ratio && parseFloat(ratio) > 0;

  return (
    <div className="min-h-[80vh] flex flex-col relative pb-12 animate-reveal">
      {/* Main Content Constrained Container */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 space-y-8 pt-6">
        
        {/* Page Header */}
        <div className="border-b border-ink/10 pb-4">
          <h1 className="font-black text-3xl text-ink m-0">Unit Conversions</h1>
          <p className="text-sm text-ink-muted mt-2">
            Define local farm measurements (e.g., Kasuku, Wheelbarrow) and translate them into standard SI units.
          </p>
        </div>

        <StorageInfoBanner />

        {/* Card 1: Add New Conversion Form */}
        <div className="bg-surface rounded-2xl shadow-sm border border-ink/10 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6 text-ink">
            <Plus className="w-5 h-5 text-brand" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Create New Conversion</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Row 1 */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
                  Material or Feed Type
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g., Dairy Meal"
                  className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:font-medium placeholder:text-ink-muted/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
                  Local Unit Name
                </label>
                <input
                  type="text"
                  value={localUnit}
                  onChange={(e) => setLocalUnit(e.target.value)}
                  placeholder="e.g., Kasuku"
                  className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:font-medium placeholder:text-ink-muted/50"
                  required
                />
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
                  Base Unit
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all cursor-pointer appearance-none"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="L">Liters (L)</option>
                  <option value="g">Grams (g)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
                  Conversion (1 Local = ? Base)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    placeholder="e.g., 2.0"
                    className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:font-medium placeholder:text-ink-muted/50"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted pointer-events-none">
                    {baseUnit}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!isFormValid}
                className="btn-command min-w-[160px] px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 group disabled:opacity-60 transition-all bg-brand text-white hover:bg-brand/90 font-bold"
              >
                Save Conversion
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Existing Conversions List */}
        <div className="bg-surface rounded-2xl shadow-sm border border-ink/10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-widest">
              Existing Conversions
            </h3>
            <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-md">
              {conversions.length} Saved
            </span>
          </div>

          <div className="space-y-3">
            {conversions.length === 0 ? (
              <EmptyConversionsState />
            ) : (
              conversions.map((conv) => (
                <ConversionRow 
                  key={conv.id} 
                  conversion={conv} 
                  onRemove={handleRemove} 
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}