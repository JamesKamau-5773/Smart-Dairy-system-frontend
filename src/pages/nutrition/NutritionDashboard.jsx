import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Wheat } from 'lucide-react';
import toast from 'react-hot-toast';
import CurrentMixCard from '../../components/nutrition/CurrentMixCard';
import ProfitabilityChart from '../../components/nutrition/ProfitabilityChart';
import TopRecipesList from './TopRecipesList';
import { getApiErrorMessage, nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import { todayLocalIso } from '../../lib/localDate';
import LABELS from '../../lib/labels';
import { readFeedCostPerLitre } from '../../lib/feedCost';
import { MIX_TYPES, buildDraftFromBatch, selectActiveMixByType } from '../../lib/activeMixes';

export default function NutritionDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // The backend's list of batches in store (type, weights, days left). Same query
  // key as the Today's Feeding page, so the two share one request.
  const feedingTodayQuery = useQuery({
    queryKey: ['feeding-today', tenantId, farmId],
    queryFn: () => nutritionApi.feedingToday(),
    enabled: !!tenantId && !!farmId,
  });
  const storeStatus = feedingTodayQuery.isError ? 'error' : feedingTodayQuery.isSuccess ? 'ready' : 'loading';

  const activeMixes = useMemo(
    () => selectActiveMixByType(feedingTodayQuery.data, feedCostEfficiency?.rows),
    [feedingTodayQuery.data, feedCostEfficiency],
  );

  const consumptionMutation = useMutation({
    mutationFn: ({ batchId, consumedWeight, feedingGroup }) => nutritionApi.createConsumptionEvent(batchId, {
      consumedWeight,
      // The farm's calendar date: the backend rejects dates after the farm's today.
      consumedOn: todayLocalIso(),
      feeding_group: feedingGroup,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['nutrition-feed-cost-efficiency', tenantId, farmId] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-active-batch-roi-trend-weekly', tenantId, farmId] }),
        queryClient.invalidateQueries({ queryKey: ['feeding-today', tenantId, farmId] }),
      ]);
      toast.success('Feeding recorded.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not record feeding. Check the details and try again.'));
    },
  });

  // active-batch-roi-trend-weekly returns { rows: [...] } (or a bare array).
  // Each point uses `feedCostPerLiter` + `weekStart`, so read those first.
  const trends = useMemo(() => {
    const rows = Array.isArray(roiTrend) ? roiTrend : (Array.isArray(roiTrend?.rows) ? roiTrend.rows : []);
    if (rows.length === 0) {
      return [];
    }

    return rows.map((point, index) => ({
      week: point.week || point.weekStart || point.week_start || point.label || `Wk ${index + 1}`,
      cost: readFeedCostPerLitre(point),
      isCurrent: Boolean(point.isCurrent),
    }));
  }, [roiTrend]);

  const recipes = useMemo(() => (Array.isArray(recipesData) ? recipesData : []), [recipesData]);

  // Thin launcher into the mixing planner: with a batch in store, its shares open as
  // an editable draft; otherwise the planner opens on that mix type's tab.
  const openPlanner = (recipeType) => {
    const mix = activeMixes[recipeType];
    navigate('/feed-nutrition/mix', { state: mix?.row ? buildDraftFromBatch(mix.row, recipeType, mix.name) : { mixType: recipeType } });
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Wheat size={12} aria-hidden="true" /> {LABELS.FEEDING_AREA}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">{LABELS.FEED_DASHBOARD}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
            Track what feed is in stock, what it costs, and which mix helps your cows give more milk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/feed-nutrition/mix')}
          className="btn-command gap-2 px-4 py-2.5 text-sm"
        >
          <PackagePlus size={18} aria-hidden="true" /> Create New Feed Batch
        </button>
      </div>

      {/* ── WHAT'S BEING FED: one card per mix type ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {MIX_TYPES.map((recipeType) => {
          const mix = activeMixes[recipeType];
          return (
            <CurrentMixCard
              key={recipeType}
              recipeType={recipeType}
              mix={mix}
              status={storeStatus}
              onRetry={() => feedingTodayQuery.refetch()}
              isRecording={consumptionMutation.isPending && consumptionMutation.variables?.batchId === mix?.batchId}
              onRecordConsumption={({ consumedWeight, feedingGroup }) => consumptionMutation.mutateAsync({
                batchId: mix.batchId,
                consumedWeight,
                feedingGroup,
              })}
              onMixBatch={() => openPlanner(recipeType)}
            />
          );
        })}
      </div>

      <ProfitabilityChart trends={trends} />

      {/* ── BOTTOM SECTION: HISTORICAL PLAYBOOK ── */}
      <TopRecipesList recipes={recipes} />
    </div>
  );
}
