import React from 'react';
import { TrendingDown } from 'lucide-react';

export default function ProfitabilityChart({ trends }) {
  return (
    <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5 flex flex-col">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-brand-dark mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
        <TrendingDown size={16} /> Feed Cost Per Liter of Milk
      </h3>
      <p className="text-xs font-medium text-ink-muted mb-8 pb-4 border-b border-ink/5">
        How much of your milk money goes to buying feed. Lower numbers mean you keep more profit.
      </p>

      <div className="flex-1 flex items-end justify-between gap-2 mt-auto pt-4 min-h-[160px]">
        {trends.map((data, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group">
            <span className={`text-[10px] font-bold mb-2 transition-colors ${data.isCurrent ? 'text-brand' : 'text-ink-muted group-hover:text-ink-strong'}`}>
              KES {data.cost.toFixed(2)}
            </span>
            <div className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${data.isCurrent ? 'bg-brand' : 'bg-brand/15 group-hover:bg-brand/30'} ${data.height}`} />
            <span className={`text-[10px] font-bold mt-3 uppercase tracking-wider ${data.isCurrent ? 'text-brand' : 'text-ink-muted'}`}>
              {data.week}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}