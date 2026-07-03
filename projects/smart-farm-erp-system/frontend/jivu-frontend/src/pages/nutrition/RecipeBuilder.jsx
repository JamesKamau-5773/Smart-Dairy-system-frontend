import React, { useState, useMemo } from 'react';
import { Calculator, AlertTriangle } from 'lucide-react';
import { calculateRecipeMetrics, validateRecipe } from '../../services/NutritionalCalculator';

const RECIPE_CONFIG = {
  dairy_meal: {
    title: 'Dairy Meal Formulator',
    defaultBatchSize: 500,
    targetProtein: 16,
  },
  main_meal: {
    title: 'Main Meal (TMR) Mixer',
    defaultBatchSize: 2000,
    targetProtein: 14,
  },
};

const getRecipeConfig = (recipeType) => RECIPE_CONFIG[recipeType] || RECIPE_CONFIG.dairy_meal;

function BatchSizeControl({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-ink/10 bg-surface-raised px-3 py-1.5 text-xs font-bold text-ink-muted">
      <span className="shrink-0">Batch Size</span>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 bg-transparent text-right font-black text-brand focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Batch size in kilograms"
      />
      <span>kg</span>
    </label>
  );
}

function RecipeAlerts({ alerts }) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2 animate-in fade-in slide-in-from-top-2">
      {alerts.map((alert, idx) => (
        <div key={idx} className={`flex items-start gap-2 p-3 rounded-md text-xs font-bold border ${alert.type === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warning/10 border-warning/20 text-warning-dark'}`}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{alert.message}</p>
        </div>
      ))}
    </div>
  );
}

function ProteinMeter({ averageProtein, targetProtein, hasWarning }) {
  return (
    <div className="space-y-1.5 mb-8 bg-surface-raised p-4 rounded-lg border border-ink/5">
      <div className="flex justify-between text-xs font-black uppercase text-ink-muted">
        <span>Target Protein ({targetProtein}%)</span>
        <span className={averageProtein >= targetProtein ? 'text-brand' : 'text-warning-dark'}>
          Current: {averageProtein.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full transition-all duration-500 ease-out ${hasWarning ? 'bg-warning' : 'bg-brand'}`}
          style={{ width: `${Math.min((averageProtein / targetProtein) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function IngredientAllocationRow({ item, onPercentageChange }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-md border border-ink/10 hover:border-brand/30 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand shadow-sm">
      <span className="col-span-5 text-sm font-bold text-ink-strong truncate pr-2">{item.name}</span>
      <div className="col-span-3 flex items-center justify-end gap-2">
        <input
          type="number"
          className="w-16 bg-transparent text-right font-black text-brand text-lg focus:outline-none"
          value={item.percentage}
          onChange={(e) => onPercentageChange(item.id, e.target.value)}
          aria-label={`${item.name} percentage`}
        />
        <span className="text-xs font-bold text-ink-muted">%</span>
      </div>
      <div className="col-span-4 text-right">
        <div className="text-sm font-black text-ink-strong tabular-nums">{item.weightKg.toFixed(2)} kg</div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          KES {item.cost.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

function MetricsFooter({ metrics }) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-ink/5">
      <div className="text-xs text-ink-muted font-medium">
        Cost: <span className="font-bold text-ink-strong">KES {metrics.totalCost.toFixed(0)}</span> / batch
      </div>
      <div className="text-xs text-ink-muted font-medium">
        Yield: <span className="font-bold text-ink-strong">{metrics.totalWeight.toFixed(0)} kg</span>
      </div>
    </div>
  );
}

export default function RecipeBuilder({ recipeType, initialIngredients }) {
  const config = getRecipeConfig(recipeType);
  const [ingredients, setIngredients] = useState(initialIngredients || []);
  const [batchSize, setBatchSize] = useState(config.defaultBatchSize);

  const metrics = useMemo(() => 
    calculateRecipeMetrics(ingredients, batchSize), [ingredients, batchSize]
  );

  const alerts = useMemo(() => 
    validateRecipe(metrics, batchSize, config.targetProtein), [metrics, batchSize, config.targetProtein]
  );

  const updatePercentage = (id, newPercentage) => {
    // Ensure we don't drop below 0
    const val = Math.max(0, Number(newPercentage) || 0);
    setIngredients(prev => prev.map(item => 
      item.id === id ? { ...item, percentage: val } : item
    ));
  };

  const updateBatchSize = (newBatchSize) => {
    const nextBatchSize = Math.max(1, Number(newBatchSize) || 1);
    setBatchSize(nextBatchSize);
  };

  return (
    <div className="bg-surface p-6 border border-ink/5 rounded-card shadow-sm">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-ink/5 pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-dark">
          <Calculator size={18} /> 
          {config.title}
        </h3>
        <BatchSizeControl value={batchSize} onChange={updateBatchSize} />
      </div>

      <RecipeAlerts alerts={alerts} />

      <ProteinMeter
        averageProtein={metrics.averageProtein}
        targetProtein={config.targetProtein}
        hasWarning={alerts.some((alert) => alert.type === 'warning')}
      />

      {/* Ingredient Inputs */}
      <div className="space-y-2 mb-8">
        <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-black uppercase text-ink-muted border-b border-ink/5">
          <div className="col-span-5">Ingredient</div>
          <div className="col-span-3 text-right">Percentage</div>
          <div className="col-span-4 text-right">Weight</div>
        </div>
        
        {metrics.ingredients.map((item) => (
          <IngredientAllocationRow
            key={item.id}
            item={item}
            onPercentageChange={updatePercentage}
          />
        ))}
      </div>
      
      <MetricsFooter metrics={metrics} />
    </div>
  );
}
