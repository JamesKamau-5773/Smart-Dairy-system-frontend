import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';
import LABELS from '../../lib/labels';
import { calculateFeedFallback } from '../../lib/feedCalculator';

export default function FeedPlanner() {
  const [targetLiters, setTargetLiters] = useState('');

  const exampleBreakdown = [
    {
      label: LABELS.TARGET_MILK,
      value: '20.3 L',
      note: 'The daily milk goal you are trying to reach.',
    },
    {
      label: LABELS.MILKING_TIME_DAIRY_MEAL,
      value: '2.87 kg',
      note: 'Extra dairy meal given while the cow is being milked to boost production.',
    },
    {
      label: LABELS.BOMA_FEEDINGS,
      value: '3x daily',
      note: 'How many times the main feed should be split while resting in the boma.',
    },
  ];

  const calcMutation = useMutation({
    mutationFn: async (liters) => {
      const baseline = parseFloat(localStorage.getItem('baseline_herd_meal_kg') || '4.0');
      try {
        const response = await apiClient.post('/v1/feed/calculate-schedule', {
          target_liters: parseFloat(liters),
          baseline_herd_meal_kg: baseline,
        });
        return response.data;
      } catch {
        // Use shared fallback implementation
        return calculateFeedFallback({ target_liters: parseFloat(liters), baseline_herd_meal_kg: baseline });
      }
    },
  });

  const handleCalculate = (event) => {
    event.preventDefault();
    if (!targetLiters || Number(targetLiters) <= 0 || calcMutation.isPending) {
      return;
    }

    calcMutation.mutate(targetLiters);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-reveal">
      <div className="border-b border-ink/10 pb-4">
        <h1 className="font-black text-3xl text-ink m-0">Feed Planner</h1>
        <p className="text-sm text-ink-muted mt-2">Calculate exactly how much dairy meal your cows need to hit their milk targets.</p>
      </div>

      <div className="bg-brand/5 border border-brand/15 rounded-2xl p-5 shadow-sm max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-brand mb-3">How to read this screen</p>
        <p className="text-sm text-ink-muted leading-6 mb-4">
          Enter a milk target and the planner will show the feeding instructions in everyday terms. For example, if the target is
          20.3 liters, the plan explains how much dairy meal goes into the trough during milking, and how many times the main feed should be split in the boma.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {exampleBreakdown.map((item) => (
            <div key={item.label} className="bg-surface rounded-xl border border-ink/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{item.label}</p>
              <p className="text-xl font-black text-brand mt-2">{item.value}</p>
              <p className="text-sm text-ink-muted mt-2 leading-5">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl border border-ink/10 max-w-xl shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-ink">Dairy Meal Calculator</h3>

        <form onSubmit={handleCalculate} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Target Liters (e.g., 35)"
            className="flex-1 p-3 border border-ink/20 rounded-lg focus:outline-none focus:border-brand"
            value={targetLiters}
            onChange={(event) => setTargetLiters(event.target.value)}
            disabled={calcMutation.isPending}
          />
          <button
            type="submit"
            disabled={calcMutation.isPending || !targetLiters}
            className="btn-command min-w-[110px] px-6 py-2 disabled:opacity-60"
          >
            {calcMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : 'Calculate'}
          </button>
          <Link to="/operations/feed-formulation" className="ml-2 text-sm underline text-ink-muted flex items-center self-center">Edit base ration</Link>
        </form>

        {calcMutation.isError && (
          <div className="mt-4 bg-danger/10 text-danger text-sm font-bold p-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {calcMutation.error?.response?.data?.error || 'Could not calculate. Please check your connection.'}
          </div>
        )}

        {/* LOADING STATE: The Skeleton shows ONLY while calculating */}
        {calcMutation.isPending && (
          <div className="mt-6 p-5 rounded-xl border border-ink/10 bg-surface-warm/40 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        )}

        {/* SUCCESS STATE: The actual calculated data */}
        {calcMutation.isSuccess && calcMutation.data && (
          <div className="mt-6 p-5 bg-brand/5 rounded-xl border border-brand/20 animate-reveal">
            <p className="text-sm font-bold text-brand uppercase mb-3 tracking-wider">Instructions</p>
            <p className="text-sm text-ink-muted mb-4 leading-6">
              Give the cow <span className="font-bold text-ink">{LABELS.MILKING_TIME_DAIRY_MEAL}</span> as a direct
              boost in the parlor, and split the rest of her feed into <span className="font-bold text-ink">{LABELS.BOMA_FEEDINGS}</span> across the day.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-surface p-3 rounded-lg border border-ink/5">
                <p className="text-[10px] font-bold text-ink-muted uppercase leading-tight">{LABELS.MILKING_TIME_DAIRY_MEAL}</p>
                <p className="font-black text-2xl text-ink mt-1">
                  {calcMutation.data.extra_milking_topup_total_kg}{' '}
                  <span className="text-sm font-medium text-ink-muted">kg</span>
                </p>
              </div>
              <div className="bg-surface p-3 rounded-lg border border-ink/5">
                <p className="text-[10px] font-bold text-ink-muted uppercase leading-tight">{LABELS.BOMA_FEEDINGS}</p>
                <p className="font-black text-2xl text-ink mt-1">
                  {calcMutation.data.suggested_yard_feedings}
                  <span className="text-sm font-medium text-ink-muted">x daily</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-ink-muted font-medium italic border-t border-ink/10 pt-3">
              {calcMutation.data.farmer_reasoning}
            </p>
          </div>
        )}

        {/* IDLE STATE: Static prompt before user calculates anything */}
        {!calcMutation.isSuccess && !calcMutation.isError && !calcMutation.isPending && (
          <div className="mt-6 p-8 rounded-xl border border-dashed border-ink/15 bg-surface-warm/40 text-center">
             <p className="text-sm text-ink-muted font-medium">{LABELS.READY_PROMPT_SMALL}</p>
          </div>
        )}
      </div>
    </div>
  );
}