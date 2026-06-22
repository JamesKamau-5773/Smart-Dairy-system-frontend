import React, { useState, useMemo } from 'react';
import { Calculator, AlertTriangle, Target } from 'lucide-react';
import { calculateRecipeMetrics, validateRecipe } from '../../services/NutritionalCalculator';

export default function RecipeBuilder({ recipeType, initialIngredients }) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  
  // Dynamic targets based on the type of formulation
  const BATCH_SIZE = recipeType === 'main_meal' ? 2000 : 500; 
  const TARGET_PROTEIN = recipeType === 'main_meal' ? 14 : 16; 

  const metrics = useMemo(() => 
    calculateRecipeMetrics(ingredients, BATCH_SIZE), [ingredients, BATCH_SIZE]
  );

  const alerts = useMemo(() => 
    validateRecipe(metrics, BATCH_SIZE, TARGET_PROTEIN), [metrics, BATCH_SIZE, TARGET_PROTEIN]
  );

  const updatePercentage = (id, newPercentage) => {
    // Ensure we don't drop below 0
    const val = Math.max(0, Number(newPercentage) || 0);
    setIngredients(prev => prev.map(item => 
      item.id === id ? { ...item, percentage: val } : item
    ));
  };

  return (
    <div className="bg-surface p-6 border border-ink/5 rounded-card shadow-sm">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6 border-b border-ink/5 pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-dark">
          <Calculator size={18} /> 
          {recipeType === 'main_meal' ? 'Main Meal (TMR) Mixer' : 'Dairy Meal Formulator'}
        </h3>
        <span className="text-xs font-bold text-ink-muted bg-surface-raised px-3 py-1.5 rounded-full border border-ink/10">
          Standard Batch: {BATCH_SIZE}kg
        </span>
      </div>

      {/* Validation Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2 animate-in fade-in slide-in-from-top-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`flex items-start gap-2 p-3 rounded-md text-xs font-bold border ${alert.type === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warning/10 border-warning/20 text-warning-dark'}`}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Protein Target Visualizer */}
      <div className="space-y-1.5 mb-8 bg-surface-raised p-4 rounded-lg border border-ink/5">
        <div className="flex justify-between text-xs font-black uppercase text-ink-muted">
          <span>Target Protein ({TARGET_PROTEIN}%)</span>
          <span className={metrics.averageProtein >= TARGET_PROTEIN ? "text-brand" : "text-warning-dark"}>
            Current: {metrics.averageProtein.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full transition-all duration-500 ease-out ${alerts.some(a => a.type === 'warning') ? 'bg-warning' : 'bg-brand'}`} 
            style={{ width: `${Math.min((metrics.averageProtein / TARGET_PROTEIN) * 100, 100)}%` }} 
          />
        </div>
      </div>

      {/* Ingredient Inputs */}
      <div className="space-y-2 mb-8">
        <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-black uppercase text-ink-muted border-b border-ink/5">
          <div className="col-span-7">Ingredient</div>
          <div className="col-span-5 text-right">Percentage (%)</div>
        </div>
        
        {ingredients.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-md border border-ink/10 hover:border-brand/30 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand shadow-sm">
            <span className="col-span-7 text-sm font-bold text-ink-strong truncate pr-2">{item.name}</span>
            <div className="col-span-5 flex items-center justify-end gap-2">
              <input 
                type="number" 
                className="w-16 bg-transparent text-right font-black text-brand text-lg focus:outline-none"
                value={item.percentage}
                onChange={(e) => updatePercentage(item.id, e.target.value)}
              />
              <span className="text-xs font-bold text-ink-muted">%</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Metrics Summary Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-ink/5">
        <div className="text-xs text-ink-muted font-medium">
          Cost: <span className="font-bold text-ink-strong">KES {metrics.totalCost.toFixed(0)}</span> / batch
        </div>
        <div className="text-xs text-ink-muted font-medium">
          Yield: <span className="font-bold text-ink-strong">{metrics.totalWeight.toFixed(0)} kg</span>
        </div>
      </div>
    </div>
  );
}