import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Calculator, ArrowRight, Droplets, Wheat, Clock, Beaker } from 'lucide-react';
import { feedApi, herdApi } from '../../lib/backendApi';
import { Skeleton } from '../../components/ui';
import LABELS from '../../lib/labels';
import { useTenant } from '../../hooks/useTenant';
import { animalYieldTargetService, summarizeTargets, buildSchedulePayload } from '../../services/animalYieldTargetService';

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'No sync yet';
  }

  const timeValue = new Date(timestamp).getTime();
  if (!Number.isFinite(timeValue)) {
    return 'No sync yet';
  }

  const diffMinutes = Math.max(Math.floor((Date.now() - timeValue) / 60000), 0);
  if (diffMinutes < 1) {
    return 'Updated just now';
  }
  if (diffMinutes < 60) {
    return `Updated ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

function CoverageTone({ coveragePercent }) {
  if (coveragePercent >= 95) {
    return <span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">High Confidence</span>;
  }
  if (coveragePercent >= 60) {
    return <span className="rounded-full bg-amber-500/10 text-amber-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Medium Confidence</span>;
  }
  return <span className="rounded-full bg-danger/10 text-danger px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Low Confidence</span>;
}

function EmptyTargetList({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/15 bg-surface-raised px-3 py-3 text-xs text-ink-muted">
      {text}
    </div>
  );
}

function CowTargetRow({ row, tone = 'default', actionLabel = null, actionTo = null }) {
  const toneClass = tone === 'warning'
    ? 'border-amber-500/20 bg-amber-500/5 text-amber-800'
    : tone === 'muted'
      ? 'border-ink/10 bg-surface-raised text-ink-muted'
      : 'border-brand/20 bg-brand/5 text-ink';

  return (
    <li className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{row.cowName}</span>
        <span className="text-xs uppercase tracking-wide">{row.currentStatus}</span>
      </div>
      {row.targetLiters ? (
        <p className="mt-1 text-xs">Target: {Number(row.targetLiters).toFixed(1)} L/day</p>
      ) : (
        <p className="mt-1 text-xs">No saved target yet.</p>
      )}
      {actionLabel && actionTo && (
        <div className="mt-2">
          <Link
            to={actionTo}
            className="inline-flex items-center rounded-md border border-ink/15 bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted hover:text-brand hover:border-brand/30"
          >
            {actionLabel}
          </Link>
        </div>
      )}
    </li>
  );
}

/**
 * SRP: Handles ONLY the empty state before a farmer calculates a target.
 */
const EmptyCalculatorState = () => (
  <div className="bg-surface rounded-2xl shadow-sm border border-ink/10 p-12 flex flex-col items-center justify-center text-center animate-reveal">
    <div className="bg-brand/5 p-4 rounded-full mb-4 border border-brand/10">
      <Calculator className="w-8 h-8 text-brand/60" />
    </div>
    <h3 className="text-lg font-bold text-ink mb-2">Set Your Milk Goal</h3>
    <p className="text-sm text-ink-muted max-w-md mx-auto">
      Enter your daily milk goal above. We will work out how much dairy meal to give during milking, protein strength, and how many feeding times to split in the boma.
    </p>
  </div>
);

/**
 * SRP: Handles ONLY the display of the calculation results.
 */
const ResultsDashboard = ({ data, targetLiters, targetSource, activeCowCount, targetedCowCount, untargetedCowCount }) => {
  if (!data) return null;
  
  // Dynamic protein logic: High yielders (>10L) require higher protein density
  const proteinTarget = targetLiters > 10 ? '16.5%' : '14.5%';

  return (
    <div className="space-y-6 animate-reveal">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Target Milk Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-brand/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-brand">
            <Droplets className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.TARGET_MILK}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">{Number(targetLiters).toFixed(1)} L</p>
          <p className="text-sm text-ink-muted font-medium">Milk you want to hit today.</p>
        </div>

        {/* Dairy Meal Protein Card - UPDATED LABEL */}
        <div className="bg-brand/5 rounded-2xl shadow-sm border border-brand/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-brand">
            <Beaker className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Protein Strength</h4>
          </div>
          <p className="text-3xl font-black text-brand mb-2">{proteinTarget}</p>
          <p className="text-sm text-brand/70 font-medium">Best protein level for this milk goal.</p>
        </div>

        {/* Dairy Meal Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-emerald-500/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <Wheat className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.MILKING_TIME_DAIRY_MEAL}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">
            {data.extra_milking_topup_total_kg} <span className="text-lg font-bold text-ink-muted">kg</span>
          </p>
          <p className="text-sm text-ink-muted font-medium">Extra feed at milking time.</p>
        </div>

        {/* Boma Feedings Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-amber-500/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <Clock className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.BOMA_FEEDINGS}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">
            {data.suggested_yard_feedings} <span className="text-lg font-bold text-ink-muted">x daily</span>
          </p>
          <p className="text-sm text-ink-muted font-medium">How many times to feed in the boma.</p>
        </div>
      </div>

      <div className="bg-brand/5 border border-brand/15 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand mb-2">How To Feed</p>
        <p className="text-sm text-ink-muted font-medium italic">{data.farmer_reasoning}</p>
      </div>

      <div className="bg-surface rounded-xl border border-ink/10 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Where This Goal Came From</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${targetSource === 'per_cow' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
            {targetSource === 'per_cow' ? 'Cow-By-Cow' : 'Whole Herd'}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink font-semibold">
          {targetSource === 'per_cow'
            ? `Using saved goals for ${targetedCowCount} out of ${activeCowCount} cows that are currently milking.`
            : 'No active cow goals were found, so we used the whole-herd goal you entered.'}
        </p>
        {targetSource === 'per_cow' && untargetedCowCount > 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            {untargetedCowCount} cows are milking but do not have saved goals yet, so they were not included in this calculation.
          </p>
        )}
      </div>
    </div>
  );
};

export default function MilkLab() {
  const navigate = useNavigate();
  const { tenantId, farmId } = useTenant();
  const [targetLiters, setTargetLiters] = useState('');

  const { data: herdData = [] } = useQuery({
    queryKey: ['milk-lab-herd', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: Boolean(tenantId),
  });

  const { data: targetOverview, isLoading: isTargetsLoading } = useQuery({
    queryKey: ['milk-lab-target-overview', tenantId, farmId, herdData.length],
    queryFn: async () => {
      const { targets } = await animalYieldTargetService.listTargets({
        cows: herdData,
        tenantId,
        farmId,
      });

      return summarizeTargets({
        cows: herdData,
        targets,
      });
    },
    enabled: !!tenantId && herdData.length > 0,
  });

  const calcMutation = useMutation({
    mutationFn: async (liters) => {
      const baseline = parseFloat(localStorage.getItem('baseline_herd_meal_kg') || '4.0');
      const { targets } = await animalYieldTargetService.listTargets({
        cows: herdData,
        tenantId,
        farmId,
      });
      const schedulePayload = buildSchedulePayload({
        cows: herdData,
        targets,
        fallbackTargetLiters: parseFloat(liters),
        baselineHerdMealKg: baseline,
      });
      const schedule = await feedApi.calculateSchedule(schedulePayload.request);

      return {
        ...schedulePayload.summary,
        data: schedule,
      };
    },
  });

  const handleCalculate = (event) => {
    event.preventDefault();
    if (!targetLiters || Number(targetLiters) <= 0 || calcMutation.isPending) return;
    calcMutation.mutate(targetLiters);
  };

  const coveragePercent = targetOverview?.coveragePercent ?? 0;
  const sourceMix = targetOverview?.sourceMix ?? { api: 0, local: 0, unknown: 0 };
  const sourceMessage = sourceMix.local > 0
    ? `${sourceMix.local} local fallback target(s) detected`
    : 'All loaded targets are from backend API';

  const handleExportToFeedFormulation = () => {
    const summary = calcMutation.data ?? {};
    navigate('/operations/feed-formulation', {
      state: {
        fromMilkLab: true,
        targetLiters: summary.targetLiters ?? Number(targetLiters),
        targetMode: summary.targetSource === 'per_cow' ? 'per_cow' : 'herd_fallback',
        activeCowCount: summary.activeCowCount ?? targetOverview?.lactatingCount ?? 0,
        targetedCowCount: summary.targetedCowCount ?? targetOverview?.targetedCount ?? 0,
        yieldTargetId: summary.data?.yield_target_id ?? summary.data?.yieldTargetId ?? null,
      },
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col relative pb-12 animate-reveal">
      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 space-y-8">
        <div className="border-b border-ink/10 pb-4">
          <h1 className="font-black text-3xl text-ink m-0">Milk Feeding Planner</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Plan the right amount of feed to help your cows reach milk goals without wasting feed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-ink/10 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Lactating Cows</p>
            <p className="mt-1 text-2xl font-black text-ink">{targetOverview?.lactatingCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cows With Saved Goals</p>
            <p className="mt-1 text-2xl font-black text-brand">{targetOverview?.targetedCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Goal Coverage</p>
            <p className="mt-1 text-2xl font-black text-ink">{coveragePercent}%</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Last Update</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatRelativeTime(targetOverview?.lastUpdatedAt)}</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-ink/10 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-ink-muted">Plan Confidence</p>
              <p className="mt-1 text-sm text-ink-muted">Confidence is based on how many milking cows have saved goals and how fresh the data is.</p>
            </div>
            <CoverageTone coveragePercent={coveragePercent} />
          </div>
          <div className="mt-3 text-sm text-ink-muted">
            {sourceMessage}
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-ink/10 p-6">
          <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label htmlFor="targetYield" className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
                Target Daily Milk (Liters)
              </label>
              <input
                id="targetYield"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g., 35.5"
                className="w-full bg-surface-raised border border-ink/20 text-ink text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                value={targetLiters}
                onChange={(event) => setTargetLiters(event.target.value)}
                disabled={calcMutation.isPending}
                required
              />
            </div>

            <button
              type="submit"
              disabled={calcMutation.isPending || !targetLiters}
              className="w-full sm:w-auto btn-command min-w-[160px] px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 group disabled:opacity-60 transition-all"
            >
              {calcMutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Computing...</span>
                </>
              ) : (
                <>
                  <span>Calculate Plan</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <Link 
              to="/operations/feed-formulation" 
              className="w-full sm:w-auto px-4 py-3 text-sm font-bold text-ink-muted hover:text-brand transition-colors text-center sm:text-left underline underline-offset-2"
            >
              Edit Current Feed Mix
            </Link>
          </form>

          <div className="mt-4 rounded-xl border border-brand/10 bg-brand/5 px-4 py-3 text-sm text-ink-muted">
            Saved cow goals are added up automatically for cows that are milking. The input above is your backup whole-herd goal if no cow goals are active.
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-ink/10 p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-ink-muted">Saved Cow Goals</p>
            <p className="text-sm text-ink-muted mt-1">
              See which milking cows already have goals and which still need one.
            </p>
          </div>

          {isTargetsLoading ? (
            <Skeleton className="h-28 rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-brand">Milking Cows With Goal ({targetOverview?.lactatingWithTarget?.length ?? 0})</p>
                <ul className="space-y-2 max-h-60 overflow-auto pr-1">
                  {(targetOverview?.lactatingWithTarget ?? []).map((row) => (
                    <CowTargetRow
                      key={`targeted-${row.cowId}`}
                      row={row}
                      actionLabel="Edit Target"
                      actionTo={`/operations/animal/${row.cowId}?tab=nutrition`}
                    />
                  ))}
                </ul>
                {(targetOverview?.lactatingWithTarget?.length ?? 0) === 0 && (
                  <EmptyTargetList text="No milking cows have a saved goal yet." />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Milking Cows Missing Goal ({targetOverview?.lactatingMissingTarget?.length ?? 0})</p>
                <ul className="space-y-2 max-h-60 overflow-auto pr-1">
                  {(targetOverview?.lactatingMissingTarget ?? []).map((row) => (
                    <CowTargetRow
                      key={`missing-${row.cowId}`}
                      row={row}
                      tone="warning"
                      actionLabel="Set Target"
                      actionTo={`/operations/animal/${row.cowId}?tab=nutrition`}
                    />
                  ))}
                </ul>
                {(targetOverview?.lactatingMissingTarget?.length ?? 0) === 0 && (
                  <EmptyTargetList text="Every milking cow already has a saved goal." />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Non-Milking Cows With Saved Goal ({targetOverview?.inactiveWithTarget?.length ?? 0})</p>
                <ul className="space-y-2 max-h-60 overflow-auto pr-1">
                  {(targetOverview?.inactiveWithTarget ?? []).map((row) => (
                    <CowTargetRow
                      key={`inactive-${row.cowId}`}
                      row={row}
                      tone="muted"
                      actionLabel="Review"
                      actionTo={`/operations/animal/${row.cowId}?tab=nutrition`}
                    />
                  ))}
                </ul>
                {(targetOverview?.inactiveWithTarget?.length ?? 0) === 0 && (
                  <EmptyTargetList text="No non-milking cows have saved goals right now." />
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-ink-muted">
            Tip: open <Link to="/operations/herd" className="underline underline-offset-2 hover:text-brand">Herd Registry</Link>, select a cow, then use Nutrition Planner to save or update that cow goal.
          </div>
        </div>

        <div className="pt-2">
          {calcMutation.isError && (
            <div className="mb-6 bg-danger/10 text-danger text-sm p-4 rounded-xl flex items-start gap-2 animate-reveal">
              <AlertCircle size={18} />
              <div>
                <p className="font-bold">Could not prepare feeding plan.</p>
                <p className="mt-1">{calcMutation.error?.response?.data?.error || 'Please try again. If it keeps failing, check saved cow goals and backend status.'}</p>
              </div>
            </div>
          )}

          {!calcMutation.isPending && !calcMutation.isSuccess && <EmptyCalculatorState />}

          {!calcMutation.isPending && calcMutation.isSuccess && (
            <>
              <ResultsDashboard
                data={calcMutation.data.data}
                targetLiters={calcMutation.data.targetLiters ?? targetLiters}
                targetSource={calcMutation.data.targetSource}
                activeCowCount={calcMutation.data.activeCowCount}
                targetedCowCount={calcMutation.data.targetedCowCount}
                untargetedCowCount={calcMutation.data.untargetedCowCount}
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleExportToFeedFormulation}
                  className="btn-command px-4 py-2.5 text-sm font-bold"
                >
                  Export To Feed Mixing Planner
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}