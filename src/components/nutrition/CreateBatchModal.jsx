import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, Loader, Package, Scale, Percent, AlertTriangle } from 'lucide-react';
import { nutritionApi } from '../../lib/backendApi';
import { getApiErrorMessage } from '../../lib/backendApi';
import { buildBatchPayload, calculateBatchTotals } from '../../lib/feedBatch';
import { useTenant } from '../../hooks/useTenant';
import toast from 'react-hot-toast';

export default function CreateBatchModal({
  isOpen,
  onClose,
  recipeType,
  ingredients = [],
  initialMixSize,
  targetProtein,
}) {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [mixSize, setMixSize] = useState(
    Number(initialMixSize) || (recipeType === 'main_meal' ? 2000 : 500)
  );

  // Step 1: Fetch the active recipe blueprint
  const { data: savedRecipeIngredients = [], isLoading: isLoadingRecipe } = useQuery({
    queryKey: ['mixer-ingredients', recipeType, tenantId, farmId],
    queryFn: () => nutritionApi.listMixerIngredients(recipeType),
    enabled: isOpen, // Only fetch when the modal is open
  });

  // Step 2: Auto-calculate physical weights based on mix size
  const batchSummary = useMemo(() => {
    const savedIngredients = Array.isArray(savedRecipeIngredients)
      ? savedRecipeIngredients
      : savedRecipeIngredients.ingredients ?? savedRecipeIngredients.adjusted_ingredients ?? [];
    const sourceIngredients = ingredients.length > 0 ? ingredients : savedIngredients;

    return calculateBatchTotals(sourceIngredients, mixSize);
  }, [ingredients, savedRecipeIngredients, mixSize]);

  const batchIngredients = batchSummary.rows;
  const batchTotals = batchSummary;
  const totalPercentage = batchIngredients.reduce((sum, ingredient) => sum + ingredient.percentage, 0);
  const hasCompleteFormula = Math.abs(totalPercentage - 100) <= 0.01;
  const maximumFeasibleBatchWeight = Number(batchSummary.maximumFeasibleBatchWeight);
  const hasKnownBatchLimit = Number.isFinite(maximumFeasibleBatchWeight) && maximumFeasibleBatchWeight > 0;

  const proteinSummaryQuery = useQuery({
    queryKey: [
      'batch-protein-summary',
      tenantId,
      farmId,
      recipeType,
      Number(mixSize),
      batchIngredients.map((ingredient) => `${ingredient.ingredientId}:${ingredient.percentage}`).join('|'),
    ],
    queryFn: () => nutritionApi.calculateNutrition({
      batch_size_kg: Number(mixSize),
      ingredients: batchIngredients.map((ingredient) => ({
        ingredient_id: ingredient.ingredientId,
        percentage: ingredient.percentage,
      })),
    }),
    enabled: Boolean(
      isOpen
      && tenantId
      && farmId
      && Number(mixSize) > 0
      && batchIngredients.length > 0
      && hasCompleteFormula
    ),
  });

  // Client-side stock check: mirror the backend's "Insufficient stock" rule so the
  // user sees the shortfall before submitting, instead of a generic 400 alert.
  const insufficientIngredients = useMemo(() => {
    return batchIngredients.filter((ing) => {
      const available = Number(ing.availableStock ?? ing.stock ?? ing.current_stock);
      // Only flag when we actually know the available quantity and it's exceeded.
      return Number.isFinite(available) && available >= 0 && ing.weight > available;
    });
  }, [batchIngredients]);
  const hasInsufficientStock = insufficientIngredients.length > 0;
  const verifiedProteinPercent = Number(proteinSummaryQuery.data?.average_protein_percent);
  const zeroProteinIngredients = (proteinSummaryQuery.data?.ingredients ?? [])
    .filter((ingredient) => Number(ingredient.protein_grams_per_kg) === 0)
    .map((ingredient) => batchIngredients.find((row) => row.ingredientId === ingredient.ingredient_id)?.name)
    .filter(Boolean);

  const createBatchMutation = useMutation({
    mutationFn: (batchPayload) => nutritionApi.createBatch(batchPayload),
    onSuccess: (createdBatch) => {
      // Refresh dashboard data so "WHAT WE'RE FEEDING NOW" updates instantly
      queryClient.invalidateQueries({ queryKey: ['nutrition-feed-cost-efficiency', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-active-batch-roi-trend-weekly', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['mixer-ingredients', recipeType, tenantId, farmId] });
      const proteinPercent = Number(createdBatch.proteinPercentage ?? 0);
      const totalProteinKg = Number(createdBatch.totalProteinGrams ?? 0) / 1000;
      toast.success(
        `${Number(createdBatch.totalWeight).toFixed(2)} kg batch recorded at ${proteinPercent.toFixed(2)}% protein (${totalProteinKg.toFixed(2)} kg total protein).`
      );
      onClose();
    },
    onError: (error) => {
      // Surface the backend's real validation message (e.g. which ingredient is
      // short and by how much) instead of a generic "check the console" alert.
      console.error('[CreateBatchModal] createBatch failed', {
        message: getApiErrorMessage(error, ''),
        status: error?.response?.status,
        data: error?.response?.data,
        recipeType,
        tenantId,
        farmId,
      });
      toast.error(getApiErrorMessage(error, 'Failed to record batch. Please try again.'));
    }
  });

  // Step 3: Send the strict batch payload to the backend
  const handleSaveBatch = async () => {
    createBatchMutation.mutate(buildBatchPayload({
      batchName: `${recipeType === 'main_meal' ? 'Main' : 'Dairy'} Feed Mix - ${new Date().toLocaleDateString()}`,
      formulaId: null,
      formulaName: `${recipeType === 'main_meal' ? 'Main' : 'Dairy'} Feed Mix`,
      totalWeight: batchTotals.totalWeight,
      ingredients: batchIngredients,
    }));
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
              max={hasKnownBatchLimit ? maximumFeasibleBatchWeight : undefined}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/50 outline-none"
            />
            {hasKnownBatchLimit && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>All {batchIngredients.length} ingredients can make one complete batch of up to {maximumFeasibleBatchWeight.toFixed(1)} kg at these shares.</span>
                <button
                  type="button"
                  onClick={() => setMixSize(Number(maximumFeasibleBatchWeight.toFixed(3)))}
                  className="shrink-0 font-bold text-brand hover:text-brand-dark"
                >
                  Use maximum batch
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Scale size={15} /> Total batch</div>
              <p className="mt-1 text-lg font-black text-slate-800">{Number(mixSize || 0).toFixed(2)} kg</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Percent size={15} /> Protein content</div>
              <p className="mt-1 text-lg font-black text-slate-800">
                {proteinSummaryQuery.data
                  ? `${Number(proteinSummaryQuery.data.average_protein_percent).toFixed(2)}%`
                  : proteinSummaryQuery.isFetching ? 'Calculating...' : '--'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Package size={15} /> Total protein</div>
              <p className="mt-1 text-lg font-black text-slate-800">
                {proteinSummaryQuery.data
                  ? `${(Number(proteinSummaryQuery.data.total_protein_grams) / 1000).toFixed(2)} kg`
                  : proteinSummaryQuery.isFetching ? 'Calculating...' : '--'}
              </p>
            </div>
          </div>

          {!hasCompleteFormula && batchIngredients.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs font-bold text-warning-dark">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Ingredient shares total {totalPercentage.toFixed(2)}%. Adjust them to exactly 100% before creating a batch.
            </div>
          )}
          {proteinSummaryQuery.data && Number(targetProtein) > 0 && verifiedProteinPercent < Number(targetProtein) && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs font-bold text-warning-dark">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              This mix contains {verifiedProteinPercent.toFixed(2)}% protein, below the {Number(targetProtein).toFixed(2)}% goal. Review the shares or ingredient nutrition values before mixing.
            </div>
          )}

          {zeroProteinIngredients.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs font-bold text-warning-dark">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Zero protein is recorded for {zeroProteinIngredients.join(', ')}. Verify that value if it is not intentional.
            </div>
          )}

          {proteinSummaryQuery.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {getApiErrorMessage(proteinSummaryQuery.error, 'Could not verify this batch protein content.')}
            </div>
          )}

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

        <div className="px-8 pb-2">
          {hasInsufficientStock && (
            <div className="flex items-start gap-2 p-3 mb-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p>Not enough stock to mix this batch:</p>
                <ul className="list-disc ml-4 mt-1 font-medium">
                  {insufficientIngredients.map((ing) => (
                    <li key={ing.ingredientId}>
                      {ing.name}: need {ing.weight.toFixed(1)} kg, only {Number(ing.availableStock ?? ing.stock ?? ing.current_stock).toFixed(1)} kg in stock
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-medium">Reduce the batch size or restock these items first.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-200">
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          <button
            type="button"
            onClick={handleSaveBatch}
            disabled={createBatchMutation.isPending || isLoadingRecipe || proteinSummaryQuery.isFetching || !proteinSummaryQuery.data || batchIngredients.length === 0 || !hasCompleteFormula || hasInsufficientStock}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300"
          >
            {createBatchMutation.isPending ? <Loader className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {createBatchMutation.isPending ? 'Recording Batch...' : `Confirm ${Number(mixSize || 0).toFixed(2)} kg Batch`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
