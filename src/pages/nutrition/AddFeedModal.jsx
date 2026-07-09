import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Beaker, Tractor } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import { getApiErrorMessage, nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import RecipeBuilder from './RecipeBuilder';

const CUSTOM_FORMULATIONS = {
  dairy_meal: {
    label: 'Dairy Meal (Concentrate)',
    ingredients: [
      { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
      { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
      { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
    ],
  },
  main_meal: {
    label: 'Main Meal (TMR)',
    ingredients: [
      { id: 'silage', name: 'Silage', percentage: 60, proteinContent: 8.0, pricePerKg: 5 },
      { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 },
      { id: 'lucerne', name: 'Lucerne Hay', percentage: 10, proteinContent: 18.0, pricePerKg: 25 }
    ],
  },
};

export default function AddFeedModal({ onClose }) {
  const [activeCustomTab, setActiveCustomTab] = useState('dairy_meal');
  const [builderIngredients, setBuilderIngredients] = useState(CUSTOM_FORMULATIONS.dairy_meal.ingredients);
  const [builderBatchSize, setBuilderBatchSize] = useState(500);
  const [errorMessage, setErrorMessage] = useState('');
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const currentFormulation = CUSTOM_FORMULATIONS[activeCustomTab];

  const computedTotals = useMemo(() => {
    const ingredients = Array.isArray(builderIngredients) ? builderIngredients : [];

    const effectiveRows = ingredients.filter((item) => Number(item.percentage) > 0);
    const totalWeight = Number(builderBatchSize) || 0;
    const totalCost = effectiveRows.reduce((sum, item) => {
      const percentage = Number(item.percentage) || 0;
      const weight = (percentage / 100) * totalWeight;
      return sum + (weight * (Number(item.pricePerKg) || 0));
    }, 0);

    return {
      rows: effectiveRows,
      totalWeight,
      totalCost,
      costPerKg: totalWeight > 0 ? totalCost / totalWeight : 0,
    };
  }, [builderBatchSize, builderIngredients]);

  const saveBatchMutation = useMutation({
    mutationFn: (payload) => nutritionApi.createBatch(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['nutrition-feed-cost-efficiency', tenantId, farmId] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-active-batch-roi-trend-weekly', tenantId, farmId] }),
      ]);
      onClose();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save feed batch. Please try again.'));
    },
  });

  const handleSaveAndMixBatch = () => {
    setErrorMessage('');

    if (computedTotals.rows.length === 0 || computedTotals.totalWeight <= 0) {
      setErrorMessage('Add at least one ingredient with a percentage before saving.');
      return;
    }

    const batchName = `${currentFormulation.label} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

    saveBatchMutation.mutate({
      batchName,
      formulaId: null,
      isSavedAsTemplate: false,
      formulaName: currentFormulation.label,
      totalWeight: computedTotals.totalWeight,
      totalCost: computedTotals.totalCost,
      costPerKg: computedTotals.costPerKg,
      ingredients: computedTotals.rows.map((item) => {
        const percentage = Number(item.percentage) || 0;
        return {
          ingredientId: item.id,
          weight: (percentage / 100) * computedTotals.totalWeight,
          percentage,
          lockedCostPerKg: Number(item.pricePerKg) || 0,
        };
      }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-modal shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* ── HEADER ── */}
        <div className="flex justify-between items-center p-6 border-b border-ink/5 bg-white shrink-0">
          <h2 className="text-lg font-black text-ink-strong flex items-center gap-2">
            <Beaker className="text-brand" size={20} /> Formulate Custom Mix
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-raised text-ink-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="p-6 overflow-y-auto">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {errorMessage && (
              <div className="mb-4">
                <AlertBanner
                  type="danger"
                  title="Batch save failed"
                  message={errorMessage}
                  onDismiss={() => setErrorMessage('')}
                />
              </div>
            )}
            
            {/* TABS */}
            <div className="mb-6 rounded-lg border border-ink/5 bg-surface-raised p-1.5 shadow-sm">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveCustomTab('dairy_meal')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-all ${
                    activeCustomTab === 'dairy_meal'
                      ? 'bg-white text-brand shadow-sm border border-ink/5'
                      : 'text-ink-muted hover:text-ink-strong'
                  }`}
                >
                  <Beaker size={18} /> {CUSTOM_FORMULATIONS.dairy_meal.label}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCustomTab('main_meal')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-all ${
                    activeCustomTab === 'main_meal'
                      ? 'bg-white text-brand shadow-sm border border-ink/5'
                      : 'text-ink-muted hover:text-ink-strong'
                  }`}
                >
                  <Tractor size={18} /> {CUSTOM_FORMULATIONS.main_meal.label}
                </button>
              </div>
            </div>

            {/* RECIPE BUILDER COMPONENT */}
            <RecipeBuilder
              key={activeCustomTab}
              recipeType={activeCustomTab}
              initialIngredients={currentFormulation.ingredients}
              onIngredientsChange={setBuilderIngredients}
              onBatchSizeChange={setBuilderBatchSize}
            />
            
            {/* FOOTER ACTIONS */}
            <div className="flex justify-end items-center mt-6 pt-6 border-t border-ink/5 gap-4">
              <button 
                onClick={onClose} 
                className="text-sm font-bold text-ink-muted hover:text-ink-strong transition-colors px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndMixBatch}
                disabled={saveBatchMutation.isPending}
                className="bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-button font-bold text-sm transition-colors shadow-sm"
              >
                {saveBatchMutation.isPending ? 'Saving…' : 'Save & Mix Batch'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}