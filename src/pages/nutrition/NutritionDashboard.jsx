import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PackagePlus, Wheat } from 'lucide-react';
import CurrentMixCard from '../../components/nutrition/CurrentMixCard';
import ProfitabilityChart from '../../components/nutrition/ProfitabilityChart';
import TopRecipesList from './TopRecipesList';
import AddFeedModal from './AddFeedModal';
import { nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

export default function NutritionDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const currentMix = useMemo(() => {
    if (!feedCostEfficiency) {
      return null;
    }

    return {
      name: feedCostEfficiency.name ?? feedCostEfficiency.mixName ?? 'Feed mix',
      totalWeight: Number(feedCostEfficiency.totalWeight ?? feedCostEfficiency.total_weight ?? 0),
      consumedWeight: Number(feedCostEfficiency.consumedWeight ?? feedCostEfficiency.consumed_weight ?? 0),
      remainingWeight: Number(feedCostEfficiency.remainingWeight ?? feedCostEfficiency.remaining_weight ?? 0),
      dailyFeedingRate: Number(feedCostEfficiency.dailyFeedingRate ?? feedCostEfficiency.daily_feeding_rate ?? 0),
      mixedOn: feedCostEfficiency.mixedOn ?? feedCostEfficiency.mixed_on ?? null,
    };
  }, [feedCostEfficiency]);

  const trends = useMemo(() => {
    if (!Array.isArray(roiTrend) || roiTrend.length === 0) {
      return [];
    }

    return roiTrend.map((point, index) => ({
      week: point.week || point.label || `Wk ${index + 1}`,
      cost: Number(point.costPerLiter ?? point.cost ?? 0),
      height: point.height || ['h-24', 'h-20', 'h-16', 'h-12', 'h-10'][Math.min(index, 4)],
      isCurrent: Boolean(point.isCurrent),
    }));
  }, [roiTrend]);

  const recipes = useMemo(() => (Array.isArray(recipesData) ? recipesData : []), [recipesData]);

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
          onClick={() => setIsModalOpen(true)}
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

      {/* ── MODAL ── */}
      {isModalOpen && (
        <AddFeedModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}