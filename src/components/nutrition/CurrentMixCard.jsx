import React from 'react';
import { PackageCheck, AlertCircle } from 'lucide-react';

export default function CurrentMixCard({ mix }) {
  const stockPercentage = Math.round((mix.remainingWeight / mix.totalWeight) * 100);
  const daysLeft = Math.floor(mix.remainingWeight / mix.dailyFeedingRate);
  const isLowStock = daysLeft <= 3;

  return (
    <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5 flex flex-col justify-between">
      <div>
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-brand-dark mb-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
          <PackageCheck size={16} /> What We're Feeding Now
        </h3>
        
        <h4 className="text-xl font-black text-ink-strong">{mix.name}</h4>
        <p className="text-xs font-medium text-ink-muted mt-1">Mixed on {mix.mixedOn}</p>

        <div className="mt-6">
          <div className="flex justify-between text-xs font-bold text-ink-strong mb-2">
            <span>Stock Level</span>
            <span>{stockPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isLowStock ? 'bg-danger' : 'bg-brand'}`} 
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <div className={`mt-4 rounded-lg p-4 border ${isLowStock ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-surface-raised border-ink/10 text-ink-strong'}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1">
            {isLowStock && <AlertCircle size={16} />}
            Will run out in {daysLeft} Days
          </div>
          <p className="text-xs font-medium opacity-80">
            The herd is eating about {mix.dailyFeedingRate} kg per day.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-surface-raised rounded-lg p-4 text-center border border-ink/5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted mb-1">Fed So Far</span>
          <span className="text-lg font-black text-ink-strong">{mix.consumedWeight} kg</span>
        </div>
        <div className="bg-surface-raised rounded-lg p-4 text-center border border-ink/5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted mb-1">Still In Store</span>
          <span className="text-lg font-black text-brand">{mix.remainingWeight} kg</span>
        </div>
      </div>
    </div>
  );
}