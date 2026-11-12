import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader, Package, Scale, Percent, AlertTriangle } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import { nutritionApi } from '../../lib/backendApi';
import { getApiErrorMessage } from '../../lib/backendApi';
import { buildBatchPayload, calculateBatchTotals, resolveMaxBatchKg, resolveSuggestedBatch } from '../../lib/feedBatch';
import { feedCopy } from '../../i18n/feed';

const { batch: batchCopy } = feedCopy;
const SUGGESTION_DAYS = [3, 7, 14];
import { useTenant } from '../../hooks/useTenant';
import toast from 'react-hot-toast';
import { reportError } from '../../lib/telemetry';

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
  // null until the farmer types a size; until then the backend's suggestion fills it.
  const [typedMixSize, setMixSize] = useState(null);
  const [suggestionDays, setSuggestionDays] = useState(7);
  const fallbackMixSize = Number(initialMixSize) || (recipeType === 'main_meal' ? 2000 : 500);

  const suggestionQuery = useQuery({
    queryKey: ['batch-suggested-size', tenantId, farmId, recipeType, suggestionDays],
    queryFn: () => nutritionApi.suggestedBatchSize(recipeType, suggestionDays),
    enabled: Boolean(isOpen && tenantId && farmId),
  });

  // Step 1: Fetch the active recipe blueprint
  const { data: savedRecipeIngredients = [], isLoading: isLoadingRecipe } = useQuery({
    queryKey: ['mixer-ingredients', recipeType, tenantId, farmId],
    queryFn: () => nutritionApi.listMixerIngredients(recipeType),
    enabled: isOpen, // Only fetch when the modal is open
  });

  const sourceIngredients = useMemo(() => {
    const savedIngredients = Array.isArray(savedRecipeIngredients)
      ? savedRecipeIngredients
      : savedRecipeIngredients.ingredients ?? savedRecipeIngredients.adjusted_ingredients ?? [];
    return ingredients.length > 0 ? ingredients : savedIngredients;
  }, [ingredients, savedRecipeIngredients]);

  // Step 2: the largest batch the stock allows, from the backend (null when no mix
  // of this type is assigned). The per-ingredient stock check below still applies.
  const maximumFeasibleBatchWeight = resolveMaxBatchKg(suggestionQuery.data);
  const hasKnownBatchLimit = maximumFeasibleBatchWeight !== null && maximumFeasibleBatchWeight > 0;
  const suggestion = resolveSuggestedBatch(suggestionQuery.data);
  // What the farmer typed wins; otherwise the suggestion; otherwise the planner's size.
  const mixSize = typedMixSize ?? suggestion.kg ?? fallbackMixSize;

  // Step 3: physical weights for the size actually used
  const batchSummary = calculateBatchTotals(sourceIngredients, mixSize);

  const batchIngredients = batchSummary.rows;
  const batchTotals = batchSummary;
  const totalPercentage = batchIngredients.reduce((sum, ingredient) => sum + ingredient.percentage, 0);
  const hasCompleteFormula = Math.abs(totalPercentage - 100) <= 0.01;

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
  const insufficientIngredients = batchIngredients.filter((ing) => {
    const available = Number(ing.availableStock ?? ing.stock ?? ing.current_stock);
    // Only flag when we actually know the available quantity and it's exceeded.
    return Number.isFinite(available) && available >= 0 && ing.weight > available;
  });
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
      reportError(error, { where: 'CreateBatchModal.createBatch' });
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

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title="Create new feed batch"
      closeLabel="Close batch form"
      footerActions={(
        <>
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
        </>
      )}
    >
      <div className="space-y-6">
          <div>
            <label htmlFor="batch-total-size" className="block text-sm font-bold text-slate-700 mb-2">Total Batch Size (KG)</label>
            <input
              id="batch-total-size"
              type="number"
              value={mixSize}
              onChange={(e) => setMixSize(e.target.value)}
              max={hasKnownBatchLimit ? maximumFeasibleBatchWeight : undefined}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/50 outline-none"
            />
            {hasKnownBatchLimit && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>All {batchIngredients.length} ingredients can make one complete batch of up to {maximumFeasibleBatchWeight} kg at these shares.</span>
                <button
                  type="button"
                  onClick={() => setMixSize(maximumFeasibleBatchWeight)}
                  className="shrink-0 font-bold text-brand hover:text-brand-dark"
                >
                  Use maximum batch
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{batchCopy.suggestTitle}</span>
              <label className="flex items-center gap-2">
                <span>{batchCopy.suggestFor}</span>
                <select
                  value={suggestionDays}
                  onChange={(event) => setSuggestionDays(Number(event.target.value))}
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-bold"
                >
                  {SUGGESTION_DAYS.map((days) => <option key={days} value={days}>{batchCopy.days(days)}</option>)}
                </select>
              </label>
            </div>
            <p role="status" className="mt-2">
              {suggestionQuery.isFetching
                ? batchCopy.suggesting
                : suggestionQuery.isError
                  ? getApiErrorMessage(suggestionQuery.error, feedCopy.errors.suggestSize)
                  : suggestion.kg
                    ? batchCopy.suggestion(suggestion.kg, suggestionDays)
                    : suggestion.reason}
            </p>
            {suggestion.capped && <p className="mt-1 font-semibold text-ink">{batchCopy.cappedToStock(suggestion.kg, suggestion.limitingIngredient)}</p>}
            {suggestion.kg && typedMixSize !== null && Number(typedMixSize) !== suggestion.kg && (
              <button type="button" onClick={() => setMixSize(null)} className="mt-2 font-bold text-brand hover:text-brand-dark">
                {batchCopy.useSuggestion}
              </button>
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
            <div className="flex items-start gap-2 rounded-lg border border-brand/40 bg-brand-50 p-3 text-xs font-semibold text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
              Ingredient shares total {totalPercentage.toFixed(2)}%. Adjust them to exactly 100% before creating a batch.
            </div>
          )}
          {proteinSummaryQuery.data && Number(targetProtein) > 0 && verifiedProteinPercent < Number(targetProtein) && (
            <div className="flex items-start gap-2 rounded-lg border border-brand/40 bg-brand-50 p-3 text-xs font-semibold text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
              This mix contains {verifiedProteinPercent.toFixed(2)}% protein, below the {Number(targetProtein).toFixed(2)}% goal. Review the shares or ingredient nutrition values before mixing.
            </div>
          )}

          {zeroProteinIngredients.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-brand/40 bg-brand-50 p-3 text-xs font-semibold text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
              Zero protein is recorded for {zeroProteinIngredients.join(', ')}. Verify that value if it is not intentional.
            </div>
          )}

          {proteinSummaryQuery.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-brand-dark/60 bg-brand-100 p-3 text-xs font-semibold text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
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
            <div className="flex items-start gap-2 p-3 mb-2 rounded-lg border border-brand-dark/60 bg-brand-100 text-ink text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-brand-dark" aria-hidden="true" />
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
    </BaseModal>
  );
}
