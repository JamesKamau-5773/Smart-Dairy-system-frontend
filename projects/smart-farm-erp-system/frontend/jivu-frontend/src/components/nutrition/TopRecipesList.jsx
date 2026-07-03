import React from 'react';
import { Trophy } from 'lucide-react';

export default function TopRecipesList({ recipes }) {
  return (
    <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5 mt-8">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-brand-dark mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
        <Trophy size={16} /> Best Performing Feed Mixes
      </h3>
      <p className="text-xs font-medium text-ink-muted mb-6">
        The feed mixes that gave you the most milk for the least amount of money.
      </p>

      <div className="space-y-3">
        {recipes.map((mix, index) => (
          <div key={mix.id} className="flex items-center justify-between bg-brand/5 border border-brand/10 rounded-lg p-4 hover:bg-brand/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-6 text-sm font-black text-brand/50">{index + 1}.</div>
              <div>
                <h4 className="text-sm font-bold text-ink-strong">{mix.name}</h4>
                <p className="text-xs font-medium text-ink-muted mt-0.5">
                  Average Daily Milk: {mix.yieldAvg.toFixed(1)} L
                </p>
              </div>
            </div>
            
            <div className="bg-white px-3 py-1.5 rounded text-xs font-black text-brand shadow-sm border border-brand/10">
              KES {mix.costPerLiter.toFixed(2)} / L
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}