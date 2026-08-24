import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Wheat } from 'lucide-react';
import CurrentMixCard from '../../components/nutrition/CurrentMixCard';
import ProfitabilityChart from '../../components/nutrition/ProfitabilityChart';
import TopRecipesList from './TopRecipesList';
import { nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

export default function NutritionDashboard() {
  const navigate = useNavigate();
  const { tenantId, farmId } = useTenant();

  const { data: feedCostEfficiency } = useQuery({
    queryKey: ['nutrition-feed-cost-efficiency', tenantId, farmId],
    queryFn: () => nutritionApi.feedCostEfficiency(),
    enabled: !!tenantId && !!farmId,
  });

  const { data: recipesData } = useQuery({
    queryKey: ['nutrition-recipes', tenantId, farmId],
    queryFn: () => nutritionApi.listRecipes(),
    enabled: !!tenantId && !!farmId,
  });

  const { data: roiTrend } = useQuery({
    queryKey: ['nutrition-active-batch-roi-trend-weekly', tenantId, farmId],
    queryFn: () => nutritionApi.activeBatchRoiTrendWeekly(),
    enabled: !!tenantId && !!farmId,
  });

  // feed-cost-efficiency returns { rows: [per-batch...] }, not a flat object.
  // The "current mix" is the most recent non-depleted batch (fallback: latest row).
  const currentMix = useMemo(() => {
    const rows = Array.isArray(feedCostEfficiency?.rows) ? feedCostEfficiency.rows : [];
    if (rows.length === 0) {
      return null;
    }

    const batch = rows.find((r) => !r.depletedOn) ?? rows[rows.length - 1];
    const ingredients = Array.isArray(batch.ingredients)
      ? batch.ingredients
      : (Array.isArray(batch.ingredient_breakdown) ? batch.ingredient_breakdown : []);

    const totalWeight = ingredients.reduce((sum, ing) => sum + (Number(ing.weight) || 0), 0);
    const consumedWeight = Number(batch.consumedWeight ?? batch.consumed_weight ?? 0);
    const remainingWeight = Number(batch.remainingWeight ?? batch.remaining_weight ?? (totalWeight - consumedWeight));

    return {
      name: batch.batchName ?? batch.name ?? 'Feed mix',
      totalWeight: Number(totalWeight.toFixed(2)),
      consumedWeight: Number(consumedWeight.toFixed(2)),
      remainingWeight: Number(remainingWeight.toFixed(2)),
      dailyFeedingRate: Number(batch.dailyFeedingRate ?? batch.daily_feeding_rate ?? 0),
      mixedOn: batch.mixedOn ?? batch.mixed_on ?? null,
    };
  }, [feedCostEfficiency]);

  // active-batch-roi-trend-weekly returns { rows: [...] } (or a bare array).
  // Each point uses `feedCostPerLiter` + `weekStart`, so read those first.
  const trends = useMemo(() => {
    const rows = Array.isArray(roiTrend) ? roiTrend : (Array.isArray(roiTrend?.rows) ? roiTrend.rows : []);
    if (rows.length === 0) {
      return [];
    }

    return rows.map((point, index) => ({
      week: point.week || point.weekStart || point.week_start || point.label || `Wk ${index + 1}`,
      cost: Number(point.feedCostPerLiter ?? point.costPerLiter ?? point.cost ?? 0),
      height: point.height || ['h-24', 'h-20', 'h-16', 'h-12', 'h-10'][Math.min(index, 4)],
      isCurrent: Boolean(point.isCurrent),
    }));
  }, [roiTrend]);

  const recipes = useMemo(() => (Array.isArray(recipesData) ? recipesData : []), [recipesData]);

  // Thin launcher: route into the canonical Feed Mixing Planner with the active
  // batch pre-loaded as an editable draft, instead of a parallel modal form.
  const handleCreateBatch = () => {
    const rows = Array.isArray(feedCostEfficiency?.rows) ? feedCostEfficiency.rows : [];
    const activeBatch = rows.find((r) => !r.depletedOn) ?? rows[rows.length - 1] ?? null;
    const ingredients = Array.isArray(activeBatch?.ingredients)
      ? activeBatch.ingredients
      : (Array.isArray(activeBatch?.ingredient_breakdown) ? activeBatch.ingredient_breakdown : []);

    const draftFormula = ingredients.map((ing) => ({
      id: String(ing.ingredientId ?? ing.ingredient_id ?? ing.ingredientName ?? ing.name),
      ingredientId: ing.ingredientId ?? ing.ingredient_id ?? null,
      ingredient_id: ing.ingredientId ?? ing.ingredient_id ?? null,
      inventory_item_id: ing.ingredientId ?? ing.ingredient_id ?? null,
      name: ing.ingredientName ?? ing.ingredient_name ?? ing.name ?? 'Ingredient',
      percentage: Number(ing.percentage ?? ing.inclusion_percentage ?? 0),
      proteinContent: Number(ing.proteinGramsPerKg ?? ing.protein_grams_per_kg ?? 0) / 10,
      pricePerKg: Number(ing.lockedCostPerKg ?? ing.locked_cost_per_kg ?? 0),
    }));

    navigate('/feed-nutrition/mix', {
      state: {
        isImportedDraft: true,
        draftType: activeBatch?.recipeType ?? activeBatch?.recipe_type ?? 'main_meal',
        draftFormula,
        draftName: activeBatch?.batchName ?? 'Current Mix',
      },
    });
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Wheat size={12} /> Feed Planner
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Feed Stock & Costs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
            Track what feed is in stock, what it costs, and which mix helps your cows give more milk.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateBatch}
          className="btn-command flex items-center gap-2 bg-brand text-surface shadow-md hover:bg-brand-dark transition-colors px-4 py-2.5 rounded-button font-bold text-sm"
        >
          <PackagePlus size={18} /> Create New Feed Batch
        </button>
      </div>

      {/* ── TOP GRID: STATUS & FINANCIALS ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CurrentMixCard mix={currentMix} />
        <ProfitabilityChart trends={trends} />
      </div>

      {/* ── BOTTOM SECTION: HISTORICAL PLAYBOOK ── */}
      <TopRecipesList recipes={recipes} />
    </div>
  );
}