import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SRP: Handles ONLY the friendly empty state for the farmer.
 */
const EmptyMixState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <Info className="mb-3 h-8 w-8 text-slate-500" />
    <h4 className="mb-1 font-semibold text-slate-900">No feed records found</h4>
    <p className="max-w-sm text-sm text-slate-600">
      Once you log your daily feed and milk yields, your top performing mixes will appear here.
    </p>
  </div>
);

/**
 * SRP: Handles ONLY the display, interaction, and defensive fallbacks of a single expandable row.
 */
const FeedMixRow = ({ recipe, index, isExpanded, onToggle, onLoadToLab }) => {
  // Ultra-safe defensive fallbacks for the data layer
  if (!recipe) return null;
  
  const recipeId = recipe?.id;
  const name = recipe?.name || 'Unnamed Mix';
  // Backend now returns a `performance` object; fall back to legacy flat fields.
  const perf = recipe?.performance ?? {};
  const yieldAvg = Number(perf.avgDailyYieldLiters ?? perf.avg_daily_yield_liters ?? recipe?.yieldAvg ?? 0);
  const costPerLiter = Number(perf.costPerLiter ?? perf.cost_per_liter ?? recipe?.costPerLiter ?? 0);
  // Safely check for either 'ingredients' or 'formula' depending on the payload shape
  const ingredientsList = Array.isArray(recipe?.ingredients) 
    ? recipe.ingredients 
    : (Array.isArray(recipe?.formula) ? recipe.formula : []);
    
  // The recipes API returns `target_protein_percentage`; fall back to `protein`.
  const protein = recipe?.target_protein_percentage ?? recipe?.protein ?? '--';
  const lastUsed = perf.lastFedOn ?? perf.last_fed_on ?? recipe?.lastUsed ?? 'Not recorded';

  return (
    <React.Fragment>
      <tr className="border-b border-slate-300 hover:bg-slate-50">
        <td className="w-20 px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-slate-700">{index + 1}</td>
        <td className="min-w-[280px] px-4 py-3">
          <button
            type="button"
            onClick={() => onToggle(recipeId)}
            className="flex w-full items-center justify-between gap-4 text-left font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            aria-expanded={isExpanded}
          >
            <span>{name}</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </td>
        <td className="min-w-[180px] px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900">{yieldAvg.toFixed(1)} L</td>
        <td className="min-w-[180px] px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900">KES {costPerLiter.toFixed(2)} / L</td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-slate-300 bg-slate-50">
          <td colSpan={4} className="px-4 py-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            
            {/* Left: Ingredient List */}
            <div className="flex-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Formula Breakdown
              </p>
              <div className="space-y-2">
                {ingredientsList.length > 0 ? (
                  ingredientsList.map((ing, idx) => {
                    const ingName = ing?.name ?? ing?.ingredient_name ?? ing?.ingredientName ?? 'Unknown Ingredient';
                    const ingPct = Number(ing?.percentage ?? ing?.inclusion_percentage ?? ing?.inclusionPercentage ?? 0);
                    return (
                      <div key={idx} className="flex items-center text-sm">
                        <span className="flex-1 text-slate-900">{ingName}</span>
                        <div className="mx-3 flex-1 border-b border-dotted border-slate-400"></div>
                        <span className="font-mono font-bold tabular-nums tracking-tight text-slate-900">{ingPct}%</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs italic text-slate-600">No formula data available for this mix.</p>
                )}
              </div>
            </div>

            {/* Right: Stats & Lab Link */}
            <div className="sm:w-48 shrink-0 flex flex-col justify-between">
              <div className="flex gap-6 mb-4 sm:mb-0">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Protein</p>
                  <p className="font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900">{protein}%</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Last Fed</p>
                  <p className="text-sm font-bold text-slate-900">{lastUsed}</p>
                </div>
              </div>

              <button 
                type="button"
                // Pass the ENTIRE recipe object up to the handler
                onClick={(e) => onLoadToLab(e, recipe)}
                className="group mt-2 flex w-fit items-center gap-1.5 text-sm font-bold text-slate-900 underline transition-colors hover:text-brand"
              >
                Load into Lab 
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

/**
 * Main Component: Acts ONLY as the state manager and list coordinator.
 */
// Each "Save As Current Feed Mix" creates a NEW recipe row (the backend auto-save
// never updates in place), so the same formula appears many times. The API returns
// no performance metrics (yieldAvg / costPerLiter) to rank by, so "best" = the most
// recently saved version of each distinct formula. Dedupe by formula and cap the list.
const MAX_MIXES_SHOWN = 5;

const formulaKeyOf = (recipe) =>
  `${(recipe?.recipe_type ?? recipe?.type ?? '').toString().toLowerCase()}|${(recipe?.name ?? '').toString().toLowerCase()}`;

const getRecency = (recipe) => {
  const ts = Date.parse(recipe?.updated_at ?? recipe?.updatedAt ?? recipe?.created_at ?? recipe?.createdAt ?? '');
  if (Number.isFinite(ts)) return ts;
  const id = Number(recipe?.id);
  return Number.isFinite(id) ? id : 0; // higher autoincrement id = more recently saved
};

// Real performance metrics (avg daily yield, cost/liter) are present on
// `recipe.performance`; prefer the higher-performing version of a formula, then
// rank the list by yield so the best mix actually surfaces first.
const getYield = (r) => Number(r?.performance?.avgDailyYieldLiters ?? r?.performance?.avg_daily_yield_liters ?? r?.yieldAvg ?? 0);
const getCost = (r) => Number(r?.performance?.costPerLiter ?? r?.performance?.cost_per_liter ?? r?.costPerLiter ?? Infinity);

function selectTopMixes(recipes) {
  const bestByFormula = new Map();
  for (const recipe of recipes) {
    if (!recipe) continue;
    const key = formulaKeyOf(recipe);
    const existing = bestByFormula.get(key);
    if (!existing) {
      bestByFormula.set(key, recipe);
      continue;
    }
    // Prefer the version with real performance; fall back to the more recent.
    const rPerf = getYield(recipe);
    const ePerf = getYield(existing);
    const better = rPerf !== ePerf
      ? rPerf > ePerf
      : getRecency(recipe) >= getRecency(existing);
    if (better) bestByFormula.set(key, recipe);
  }
  // Rank by avg daily yield (desc), then cost/liter (asc), then recency (desc).
  return [...bestByFormula.values()]
    .sort((a, b) =>
      (getYield(b) - getYield(a)) ||
      (getCost(a) - getCost(b)) ||
      (getRecency(b) - getRecency(a))
    )
    .slice(0, MAX_MIXES_SHOWN);
}

export default function TopRecipesList({ recipes }) {
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  // Defensive: Ensure we are mapping over an array, then dedupe to top mixes.
  const safeRecipes = selectTopMixes(Array.isArray(recipes) ? recipes : []);

  const handleToggle = (id) => {
    setExpandedId((prevId) => (prevId === id ? null : id));
  };

  const handleLoadRecipe = (e, recipe) => {
    e.stopPropagation(); 
    
    // Pass the fully structured payload that the Nutrition Lab's draft mode expects
    navigate('/feed-nutrition/mix', { 
      state: { 
        draftMixId: recipe.id,
        draftType: recipe.type, 
        draftFormula: recipe.formula || recipe.ingredients, 
        isImportedDraft: true 
      } 
    });
  };

  return (
    <div className="mt-8 border border-slate-300 bg-white p-6 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={18} className="text-slate-900" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Best Performing Feed Mixes
        </h3>
      </div>
      <p className="mb-6 text-sm font-medium text-slate-600">
        The feed mixes giving you the most milk for the least amount of money.
      </p>

      <div className="overflow-x-auto border border-slate-300">
        {safeRecipes.length === 0 ? (
          <EmptyMixState />
        ) : (
          <table className="min-w-[760px] w-full border-collapse text-left">
            <thead className="bg-slate-100">
              <tr className="border-b border-slate-300">
                <th scope="col" className="w-20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Rank</th>
                <th scope="col" className="min-w-[280px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Mix Name</th>
                <th scope="col" className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Daily Milk Average</th>
                <th scope="col" className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Cost per Liter</th>
              </tr>
            </thead>
            <tbody>
              {safeRecipes.map((recipe, index) => (
                <FeedMixRow
                  key={recipe?.id || `fallback-${index}`}
                  recipe={recipe}
                  index={index}
                  isExpanded={expandedId === recipe?.id}
                  onToggle={handleToggle}
                  onLoadToLab={handleLoadRecipe}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}