import React from 'react';
import { Activity, BatteryMedium, AlertCircle } from 'lucide-react';
import DashboardCard from '../ui/DashboardCard';

export default function CurrentMixCard({ mix }) {
  if (!mix || mix.totalWeight == null || mix.remainingWeight == null) {
    return (
      <DashboardCard flexCol>
        <div className="flex items-center gap-2 text-brand">
          <AlertCircle size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Current Feed Mix</span>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-surface-warm p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Activity size={20} />
          </div>
          <h3 className="text-lg font-bold text-ink">No Active Feed Mix</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Formulate and save a new batch to start tracking inventory.
          </p>
        </div>
      </DashboardCard>
    );
  }

  const total = Math.max(0, parseFloat(mix.totalWeight) || 0);
  const remaining = Math.min(total, Math.max(0, parseFloat(mix.remainingWeight) || 0));
  const consumed = total - remaining;
  const burnRate = Math.max(1, parseFloat(mix.dailyFeedingRate) || 1);

  const percentRemaining = total > 0 ? (remaining / total) * 100 : 0;
  const daysRemaining = remaining > 0 ? Math.floor(remaining / burnRate) : 0;
  const isRunningOut = percentRemaining <= 25;

  return (
    <DashboardCard flexCol>
      <div className="flex items-center gap-2 text-brand">
        <BatteryMedium size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">Current Feed Mix</span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-2xl font-black text-ink tracking-tight">{mix.name}</h3>
          <p className="mt-1 text-sm text-ink-muted">Mixed on {mix.mixedOn}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink-muted">
            <span>Store remaining</span>
            <span>{percentRemaining.toFixed(0)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-warm">
            <div
              className={`h-full rounded-full transition-all ${isRunningOut ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${isRunningOut ? 'border-danger/20 bg-danger/5' : 'border-brand/15 bg-brand/5'}`}>
          <div className="text-sm font-bold text-ink">
            Will run out in {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''}
          </div>
          <p className="mt-1 text-xs leading-6 text-ink-muted">
            Feeding roughly {burnRate} kg every day
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-warm p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Eaten</div>
            <div className="mt-1 text-xl font-black text-ink">{consumed.toFixed(1)} kg</div>
          </div>
          <div className="rounded-2xl bg-surface-warm p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Left</div>
            <div className="mt-1 text-xl font-black text-ink">{remaining.toFixed(1)} kg</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}