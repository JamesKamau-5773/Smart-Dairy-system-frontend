import React, { useMemo } from 'react';
import { Trophy, FileStack } from 'lucide-react';
import DashboardCard from '../ui/DashboardCard';

export default function TopRecipesList({ recipes }) {
  const rankedRecipes = useMemo(() => {
    if (!recipes || !Array.isArray(recipes)) return [];
    return [...recipes].sort((a, b) => a.costPerLiter - b.costPerLiter);
  }, [recipes]);

  if (rankedRecipes.length === 0) {
    return (
      <DashboardCard flexCol>
        <div className="flex items-center gap-2 text-brand">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Most Profitable Recipes</span>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-surface-warm p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <FileStack size={20} />
          </div>
          <h3 className="text-lg font-bold text-ink">No Recipes Found</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Save your feed formulations to build a library of your best performing mixes.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard flexCol>
      <div className="flex items-center gap-2 text-brand">
        <Trophy size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">Most Profitable Recipes</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-ink-muted">
        Your past feed mixes that gave the most milk for the lowest cost.
      </p>

      <div className="mt-6 space-y-3">
        {rankedRecipes.slice(0, 5).map((recipe, index) => (
          <div key={recipe.id ?? `${recipe.name}-${index}`} className="rounded-2xl border border-ink/10 bg-surface-warm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-ink">
                  {index + 1}. {recipe.name}
                </div>
                <div className="mt-1 text-xs text-ink-muted">Average Daily Milk: {recipe.yieldAvg.toFixed(1)} L</div>
              </div>
              <div className="rounded-full bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand whitespace-nowrap">
                KES {recipe.costPerLiter.toFixed(2)}/L
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}