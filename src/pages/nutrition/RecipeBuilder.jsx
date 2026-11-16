import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, AlertTriangle } from 'lucide-react';
import { calculateRecipeMetrics, validateRecipe } from '../../services/NutritionalCalculator';
import DataWarningList from '../../components/inventory/DataWarningList';
import { getShareTotal, sharesAddUp } from '../../lib/mixPlannerRules';
import { feedCopy } from '../../i18n/feed';

const copy = feedCopy.builder;

const RECIPE_CONFIG = {
  dairy_meal: {
    get title() { return copy.titles.dairy_meal; },
    defaultBatchSize: 500,
    targetProtein: 16,
  },
  main_meal: {
    get title() { return copy.titles.main_meal; },
    defaultBatchSize: 2000,
    targetProtein: 14,
  },
};

const getRecipeConfig = (recipeType) => RECIPE_CONFIG[recipeType] || RECIPE_CONFIG.dairy_meal;

const resolveBatchSize = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

function BatchSizeControl({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-ink/10 bg-surface-raised px-3 py-1.5 text-xs font-bold text-ink-muted">
      <span className="shrink-0">{copy.mixSize}</span>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 bg-transparent text-right font-black text-brand focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={copy.batchSizeLabel}
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
        <div key={idx} className="flex items-start gap-2 rounded-md border border-brand/20 bg-brand-50 p-3 text-xs font-bold text-brand-dark">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{alert.message}</p>
        </div>
      ))}
    </div>
  );
}

function ProteinMeter({ averageProtein, targetProtein }) {
  return (
    <div className="space-y-1.5 mb-8 bg-surface-raised p-4 rounded-lg border border-ink/5">
      <div className="flex justify-between text-xs font-black uppercase text-ink-muted">
        <span>{copy.proteinGoal(targetProtein)}</span>
        <span className="text-brand-dark">
          {copy.currentMix(averageProtein.toFixed(1))}
        </span>
      </div>
      <div className="h-2.5 w-full bg-white rounded-full overflow-hidden ">
        <div
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${Math.min((averageProtein / targetProtein) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function IngredientAllocationRow({ item, warnings, onPercentageChange, onApplyFix, pendingFixCode }) {
  const availableStock = Number(item.availableStock ?? 0);
  const showStock = Number.isFinite(availableStock) && availableStock > 0;

  return (
    <div className="rounded-md border border-ink/10 bg-white p-3 transition-colors hover:border-brand/30 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
    <div className="grid grid-cols-12 items-center gap-2">
      <div className="col-span-4 min-w-0 pr-2">
        <div className="text-sm font-bold text-ink-strong truncate">{item.name}</div>
        {showStock && (
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            {copy.inStock(availableStock.toFixed(0), item.stockUnit || 'kg')}
          </div>
        )}
      </div>
      <div className="col-span-4 flex items-center justify-end gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="any"
          className="w-24 rounded-md border border-ink/15 bg-surface-raised px-2 py-1 text-right text-lg font-black text-brand focus:outline-none"
          value={item.percentage}
          onChange={(e) => onPercentageChange(item.id, e.target.value)}
          aria-label={copy.percentageLabel(item.name)}
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
      {warnings?.length > 0 && (
        <div className="mt-2">
          <DataWarningList
            warnings={warnings}
            onApplyFix={onApplyFix ? (code) => onApplyFix(item, code) : undefined}
            pendingCode={pendingFixCode}
          />
        </div>
      )}
    </div>
  );
}

function MetricsFooter({ metrics }) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-ink/5">
      <div className="text-xs text-ink-muted font-medium">
        {copy.costPerBatch} <span className="font-bold text-ink-strong">KES {metrics.totalCost.toFixed(0)}</span>{copy.perBatch}
      </div>
      <div className="text-xs text-ink-muted font-medium">
        {copy.yield} <span className="font-bold text-ink-strong">{metrics.totalWeight.toFixed(0)} kg</span>
      </div>
    </div>
  );
}

export default function RecipeBuilder({
  recipeType,
  initialIngredients,
  ingredients: controlledIngredients,
  initialBatchSize,
  onIngredientsChange,
  onBatchSizeChange,
  targetProtein,
  isLoading = false,
  ingredientWarnings = {},
  onApplyFix,
  pendingFix = null,
}) {
  const config = getRecipeConfig(recipeType);
  const resolvedTargetProtein = Number.isFinite(Number(targetProtein)) && Number(targetProtein) > 0
    ? Number(targetProtein)
    : config.targetProtein;
  const isControlledIngredients = Array.isArray(controlledIngredients);
  const [ingredients, setIngredients] = useState(initialIngredients || []);
  const [batchSize, setBatchSize] = useState(resolveBatchSize(initialBatchSize, config.defaultBatchSize));
  const activeIngredients = isControlledIngredients
    ? (Array.isArray(controlledIngredients) ? controlledIngredients : [])
    : ingredients;

  useEffect(() => {
    if (isControlledIngredients) {
      return;
    }

    setIngredients(Array.isArray(initialIngredients) ? initialIngredients : []);
  }, [initialIngredients, isControlledIngredients]);

  useEffect(() => {
    const nextBatchSize = resolveBatchSize(initialBatchSize, config.defaultBatchSize);
    setBatchSize((currentBatchSize) => (currentBatchSize === nextBatchSize ? currentBatchSize : nextBatchSize));
  }, [recipeType, initialBatchSize, config.defaultBatchSize]);

  useEffect(() => {
    if (isControlledIngredients) {
      return;
    }

    if (typeof onIngredientsChange === 'function') {
      onIngredientsChange(ingredients);
    }
  }, [ingredients, isControlledIngredients, onIngredientsChange]);

  useEffect(() => {
    if (typeof onBatchSizeChange === 'function') {
      onBatchSizeChange(batchSize);
    }
  }, [batchSize, onBatchSizeChange]);

  const metrics = useMemo(() => 
    calculateRecipeMetrics(activeIngredients, batchSize), [activeIngredients, batchSize]
  );

  const shareTotal = getShareTotal(activeIngredients);

  const alerts = useMemo(() => 
    validateRecipe(metrics, batchSize, resolvedTargetProtein), [metrics, batchSize, resolvedTargetProtein]
  );

  const updatePercentage = (id, newPercentage) => {
    // Ensure we don't drop below 0
    const val = Math.max(0, Number(newPercentage) || 0);
    const nextIngredients = activeIngredients.map((item) =>
      item.id === id ? { ...item, percentage: val } : item
    );

    if (isControlledIngredients) {
      if (typeof onIngredientsChange === 'function') {
        onIngredientsChange(nextIngredients);
      }
      return;
    }

    setIngredients(nextIngredients);
  };

  const updateBatchSize = (newBatchSize) => {
    const nextBatchSize = Math.max(1, Number(newBatchSize) || 1);
    setBatchSize(nextBatchSize);
  };

  return (
    <div className="bg-surface p-6 border border-ink/5 rounded-card ">
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
        targetProtein={resolvedTargetProtein}
      />

      {/* Ingredient Inputs */}
      <div className="space-y-2 mb-8">
        <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-black uppercase text-ink-muted border-b border-ink/5">
          <div className="col-span-4">{copy.feedItem}</div>
          <div className="col-span-4 text-right">{copy.share}</div>
          <div className="col-span-4 text-right">{copy.mixAmount}</div>
        </div>

        {isLoading ? (
          <div className="px-3 py-6 text-sm text-ink-muted">{copy.loading}</div>
        ) : metrics.ingredients.length > 0 ? (
          metrics.ingredients.map((item) => (
            <IngredientAllocationRow
              key={item.id}
              item={item}
              warnings={ingredientWarnings[item.ingredientId ?? item.id]}
              onPercentageChange={updatePercentage}
              onApplyFix={onApplyFix}
              pendingFixCode={pendingFix?.ingredientId === (item.ingredientId ?? item.id) ? pendingFix.code : null}
            />
          ))
        ) : (
          <div className="px-3 py-6 text-sm text-ink-muted">{copy.empty}</div>
        )}
      </div>
      
      {metrics.ingredients.length > 0 && (
        <p role="status" className={`mb-4 text-right text-xs font-bold ${sharesAddUp(shareTotal) ? 'text-ink-muted' : 'text-danger'}`}>
          {feedCopy.planner.shareTotal(shareTotal)}
        </p>
      )}

      <MetricsFooter metrics={metrics} />
    </div>
  );
}
