import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, Loader, Package, Scale, Percent } from 'lucide-react';
import { nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

export default function CreateBatchModal({
  isOpen,
  onClose,
  recipeType,
  ingredients = [],
  initialMixSize,
}) {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [mixSize, setMixSize] = useState(2000);

  // Step 1: Fetch the active recipe blueprint
  const { data: savedRecipeIngredients = [], isLoading: isLoadingRecipe } = useQuery({
    queryKey: ['mixer-ingredients', recipeType, tenantId, farmId],
    queryFn: () => nutritionApi.listMixerIngredients(recipeType),
    enabled: isOpen, // Only fetch when the modal is open
  });

  useEffect(() => {
    // Reset state when modal opens/closes
    if (isOpen) {
      setMixSize(Number(initialMixSize) || (recipeType === 'main_meal' ? 2000 : 500));
    }
  }, [isOpen, recipeType, initialMixSize]);

  // Step 2: Auto-calculate physical weights based on mix size
  const batchIngredients = useMemo(() => {
    const totalBatchWeight = Number(mixSize || 0);
    const savedIngredients = Array.isArray(savedRecipeIngredients)
      ? savedRecipeIngredients
      : savedRecipeIngredients.ingredients ?? savedRecipeIngredients.adjusted_ingredients ?? [];
    const sourceIngredients = ingredients.length > 0 ? ingredients : savedIngredients;

    return sourceIngredients.map(ing => {
      const sharePercentage = Number(ing.percentage ?? ing.inclusion_percentage ?? 0);
      const parsedCostPerKg = Number(ing.pricePerKg ?? ing.cost_per_kg ?? ing.costPerKg ?? 0);
      return {
        ingredientId: ing.ingredient_id ?? ing.ingredientId ?? ing.inventory_item_id ?? ing.id,
        name: ing.name ?? ing.ingredient_name ?? 'Ingredient',
        percentage: sharePercentage,
        costPerKg: Number.isFinite(parsedCostPerKg) ? parsedCostPerKg : 0,
        // Convert the recipe's percentage into physical kilograms
        weight: (sharePercentage / 100) * totalBatchWeight
      };
    }).filter(ing => ing.weight > 0); // Only include ingredients actually in the mix

  }, [ingredients, savedRecipeIngredients, mixSize]);

  const batchTotals = useMemo(() => {
    const totalWeight = Number(mixSize || 0);
    const totalCost = batchIngredients.reduce(
      (sum, ingredient) => sum + (ingredient.weight * ingredient.costPerKg),
      0
    );

    return {
      totalWeight,
      totalCost,
      costPerKg: totalWeight > 0 ? totalCost / totalWeight : 0,
    };
  }, [batchIngredients, mixSize]);

  const createBatchMutation = useMutation({
    mutationFn: (batchPayload) => nutritionApi.createBatch(batchPayload),
    onSuccess: () => {
      // Refresh dashboard data so "WHAT WE'RE FEEDING NOW" updates instantly
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-dashboard'] });
      alert("Batch successfully recorded and inventory deducted!");
      onClose();
    },
    onError: (error) => {
      console.error("Batch creation failed:", error);
      alert("Failed to record batch. Check the console for details.");
    }
  });

  // Step 3: Send the strict batch payload to the backend
  const handleSaveBatch = async () => {
    const batchPayload = {
      batchName: `${recipeType === 'main_meal' ? 'Main' : 'Dairy'} Feed Mix - ${new Date().toLocaleDateString()}`,
      formulaId: null,
      formulaName: `${recipeType === 'main_meal' ? 'Main' : 'Dairy'} Feed Mix`,
      isSavedAsTemplate: false,
      totalWeight: batchTotals.totalWeight,
      totalCost: batchTotals.totalCost,
      costPerKg: batchTotals.costPerKg,
      ingredients: batchIngredients.map(ing => ({
        ingredientId: ing.ingredientId,
        percentage: ing.percentage,
        weight: ing.weight,
        lockedCostPerKg: ing.costPerKg,
      }))
    };

    createBatchMutation.mutate(batchPayload);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-reveal">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-black text-lg text-slate-800">Create New Feed Batch</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Total Batch Size (KG)</label>
            <input
              type="number"
              value={mixSize}
              onChange={(e) => setMixSize(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/50 outline-none"
            />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">Calculated Ingredient Weights</h4>
            {isLoadingRecipe ? (
              <div className="text-sm text-slate-500">Loading active recipe...</div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 grid grid-cols-3 gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase">
                  <span>Ingredient</span>
                  <span className="text-right">Percentage</span>
                  <span className="text-right">Weight (KG)</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {batchIngredients.map(ing => (
                    <div key={ing.ingredientId} className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-slate-100 text-sm">
                      <span className="font-medium text-slate-800">{ing.name}</span>
                      <span className="text-right text-slate-600">{ing.percentage.toFixed(2)}%</span>
                      <span className="text-right font-bold text-slate-800">{ing.weight.toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-200">
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          <button
            type="button"
            onClick={handleSaveBatch}
            disabled={createBatchMutation.isPending || isLoadingRecipe || batchIngredients.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300"
          >
            {createBatchMutation.isPending ? <Loader className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {createBatchMutation.isPending ? 'Recording Batch...' : 'Confirm & Record Batch'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
