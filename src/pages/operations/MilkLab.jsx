import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle, Calculator, ArrowRight, Droplets, Wheat, Clock } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';
import LABELS from '../../lib/labels';
import { calculateFeedFallback } from '../../lib/feedCalculator';

/**
 * SRP: Handles ONLY the empty state before a farmer calculates a target.
 */
const EmptyCalculatorState = () => (
  <div className="bg-surface rounded-2xl shadow-sm border border-ink/10 p-12 flex flex-col items-center justify-center text-center animate-reveal">
    <div className="bg-brand/5 p-4 rounded-full mb-4 border border-brand/10">
      <Calculator className="w-8 h-8 text-brand/60" />
    </div>
    <h3 className="text-lg font-bold text-ink mb-2">Awaiting Milk Target</h3>
    <p className="text-sm text-ink-muted max-w-md mx-auto">
      Enter your target milk amount above. The engine will calculate your exact milking-time dairy meal requirements and boma feeding splits.
    </p>
  </div>
);

/**
 * SRP: Handles ONLY the display of the calculation results.
 */
const ResultsDashboard = ({ data, targetLiters }) => {
  if (!data) return null;

  return (
    <div className="space-y-6 animate-reveal">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Target Milk Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-brand/20 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-brand">
            <Droplets className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.TARGET_MILK}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">{Number(targetLiters).toFixed(1)} L</p>
          <p className="text-sm text-ink-muted font-medium">The daily milk goal you are trying to reach.</p>
        </div>

        {/* Dairy Meal Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-emerald-500/20 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <Wheat className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.MILKING_TIME_DAIRY_MEAL}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">
            {data.extra_milking_topup_total_kg} <span className="text-lg font-bold text-ink-muted">kg</span>
          </p>
          <p className="text-sm text-ink-muted font-medium">Extra dairy meal given while in the parlor to boost milk.</p>
        </div>

        {/* Boma Feedings Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-amber-500/20 p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <Clock className="w-5 h-5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">{LABELS.BOMA_FEEDINGS}</h4>
          </div>
          <p className="text-3xl font-black text-ink mb-2">
            {data.suggested_yard_feedings} <span className="text-lg font-bold text-ink-muted">x daily</span>
          </p>
          <p className="text-sm text-ink-muted font-medium">How many times the main feed should be split while resting.</p>
        </div>
      </div>

      {/* Farmer Reasoning Footer */}
      <div className="bg-brand/5 border border-brand/15 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand mb-2">Instructions</p>
        <p className="text-sm text-ink-muted font-medium italic">
          {data.farmer_reasoning}
        </p>
      </div>
    </div>
  );
};

export default function FeedPlanner() {
  const [targetLiters, setTargetLiters] = useState('');

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
        // Shared fallback implementation
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
    <div className="min-h-[80vh] flex flex-col relative pb-12 animate-reveal">
      {/* Main Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 space-y-8">
        
        {/* Page Header */}
        <div className="border-b border-ink/10 pb-4">
          <h1 className="font-black text-3xl text-ink m-0">Feed Planner</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Calculate exactly how much dairy meal your cows need to hit their milk targets without overspending on feed.
          </p>
        </div>

        {/* Action Center (Calculator Form) */}
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
                className="w-full bg-surface-raised border border-ink/20 text-ink text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:font-medium placeholder:text-ink-muted/50"
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
              Edit Base Ration
            </Link>
          </form>
        </div>

        {/* Dynamic State Management Area */}
        <div className="pt-2">
          {calcMutation.isError && (
            <div className="mb-6 bg-danger/10 text-danger text-sm font-bold p-4 rounded-xl flex items-center gap-2 animate-reveal">
              <AlertCircle size={18} />
              {calcMutation.error?.response?.data?.error || 'Could not calculate. Please check your connection.'}
            </div>
          )}

          {calcMutation.isPending && (
            <div className="p-6 rounded-2xl border border-ink/5 bg-surface shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}

          {!calcMutation.isPending && !calcMutation.isSuccess && (
            <EmptyCalculatorState />
          )}

          {!calcMutation.isPending && calcMutation.isSuccess && (
            <ResultsDashboard data={calcMutation.data} targetLiters={targetLiters} />
          )}
        </div>

      </div>
    </div>
  );
}