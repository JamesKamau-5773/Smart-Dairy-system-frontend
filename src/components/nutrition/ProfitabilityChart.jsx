import React from 'react';
import { Coins, LineChart } from 'lucide-react';
import DashboardCard from '../ui/DashboardCard';

export default function ProfitabilityChart({ trends }) {
  if (!trends || trends.length === 0) {
    return (
      <DashboardCard flexCol>
        <div className="flex items-center gap-2 text-brand">
          <LineChart size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Feed Cost per Liter Sold</span>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-surface-warm p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Coins size={20} />
          </div>
          <h3 className="text-lg font-bold text-ink">No Profitability Data</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Record feed costs and milk sales for at least a week to see your financial trends.
          </p>
        </div>
      </DashboardCard>
    );
  }

  const maxCost = Math.max(...trends.map((trend) => trend.cost));
  const minCost = Math.min(...trends.map((trend) => trend.cost));

  return (
    <DashboardCard flexCol>
      <div className="flex items-center gap-2 text-brand">
        <LineChart size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">Feed Cost per Liter Sold</span>
      </div>

      <div className="mt-4">
        <p className="text-sm leading-6 text-ink-muted">
          Tracking your feed expenses against milk sales. Lower bars mean higher profit.
        </p>
      </div>

      <div className="mt-6 flex items-end gap-3 h-56">
        {trends.map((trend) => {
          const heightPercent = maxCost > 0 ? (trend.cost / maxCost) * 100 : 0;
          const isBest = trend.cost === minCost;

          return (
            <div key={trend.week} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-t-xl transition-all ${isBest ? 'bg-brand' : 'bg-brand/35'}`}
                  style={{ height: `${Math.max(12, heightPercent)}%` }}
                  title={`${trend.week}: KES ${trend.cost.toFixed(2)}`}
                />
              </div>
              <div className="text-[11px] font-bold text-ink-muted">KES {trend.cost.toFixed(2)}</div>
              <div className={`text-[10px] font-bold uppercase tracking-widest ${isBest ? 'text-brand' : 'text-ink-muted'}`}>
                {trend.week}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}