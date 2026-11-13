import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCostPerLitre, readFeedCostPerLitre } from '../../lib/feedCost';
import { formatLitres } from '../../lib/numberFormat';
import { hasRowsToShow } from '../../lib/listLoadState';
import { CardSkeletons, ListLoadNotices } from '../../components/ui/ListLoadState';
import { feedCopy } from '../../i18n/feed';

const copy = feedCopy.recipes;

// Values the backend didn't send show as "—", never as 0.
const yieldOf = (recipe) => recipe?.performance?.avgDailyYieldLiters ?? recipe?.performance?.avg_daily_yield_liters ?? recipe?.yieldAvg ?? null;
const shareOf = (ingredient) => {
  const value = ingredient?.percentage ?? ingredient?.inclusion_percentage ?? ingredient?.inclusionPercentage;
  return value === null || value === undefined || value === '' ? '—' : `${Number(value)}%`;
};
const proteinOf = (recipe) => {
  const value = recipe?.target_protein_percentage ?? recipe?.protein;
  return value === null || value === undefined || value === '' ? '—' : `${value}%`;
};

/**
 * SRP: Handles ONLY the friendly empty state for the farmer.
 */
const EmptyMixState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <Info className="mb-3 h-8 w-8 text-ink-muted" />
    <h4 className="mb-1 font-semibold text-ink">{copy.emptyTitle}</h4>
    <p className="max-w-sm text-sm text-ink-muted">
      {copy.emptyText}
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
  const name = recipe?.name || copy.unnamed;
  // Backend now returns a `performance` object; fall back to legacy flat fields.
  const perf = recipe?.performance ?? {};
  const yieldAvg = yieldOf(recipe);
  const costPerLiter = readFeedCostPerLitre(perf) ?? readFeedCostPerLitre(recipe);
  // Safely check for either 'ingredients' or 'formula' depending on the payload shape
  const ingredientsList = Array.isArray(recipe?.ingredients) 
    ? recipe.ingredients 
    : (Array.isArray(recipe?.formula) ? recipe.formula : []);
    
  // The recipes API returns `target_protein_percentage`; fall back to `protein`.
  const protein = proteinOf(recipe);
  const lastUsed = perf.lastFedOn ?? perf.last_fed_on ?? recipe?.lastUsed ?? copy.notRecorded;

  return (
    <React.Fragment>
      <tr className="border-b border-ink/10 hover:bg-brand-50">
        <td className="w-20 px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-ink-muted">{index + 1}</td>
        <td className="min-w-[280px] px-4 py-3">
          <button
            type="button"
            onClick={() => onToggle(recipeId)}
            className="flex w-full items-center justify-between gap-4 text-left font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-expanded={isExpanded}
          >
            <span>{name}</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </td>
        <td className="min-w-[180px] px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-ink">{formatLitres(yieldAvg)}</td>
        <td className="min-w-[180px] px-4 py-3 font-mono text-sm font-bold tabular-nums tracking-tight text-ink">{formatCostPerLitre(costPerLiter)}</td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-ink/10 bg-ink-50">
          <td colSpan={4} className="px-4 py-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            
            {/* Left: Ingredient List */}
            <div className="flex-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                {copy.breakdown}
              </p>
              <div className="space-y-2">
                {ingredientsList.length > 0 ? (
                  ingredientsList.map((ing, idx) => {
                    const ingName = ing?.name ?? ing?.ingredient_name ?? ing?.ingredientName ?? copy.unknownIngredient;
                    return (
                      <div key={idx} className="flex items-center text-sm">
                        <span className="flex-1 text-ink">{ingName}</span>
                        <div className="mx-3 flex-1 border-b border-dotted border-ink/20"></div>
                        <span className="font-mono font-bold tabular-nums tracking-tight text-ink">{shareOf(ing)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs italic text-ink-muted">{copy.noFormula}</p>
                )}
              </div>
            </div>

            {/* Right: Stats & Lab Link */}
            <div className="sm:w-48 shrink-0 flex flex-col justify-between">
              <div className="flex gap-6 mb-4 sm:mb-0">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.protein}</p>
                  <p className="font-mono text-sm font-bold tabular-nums tracking-tight text-ink">{protein}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.lastFed}</p>
                  <p className="text-sm font-bold text-ink">{lastUsed}</p>
                </div>
              </div>

              <button 
                type="button"
                // Pass the ENTIRE recipe object up to the handler
                onClick={(e) => onLoadToLab(e, recipe)}
                className="group mt-2 flex w-fit items-center gap-1.5 text-sm font-bold text-ink underline transition-colors hover:text-brand"
              >
                {copy.loadIntoLab}
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
const getCost = (r) => readFeedCostPerLitre(r?.performance) ?? readFeedCostPerLitre(r) ?? Infinity;

// TODO(BR-004): ranking "best" mixes is the backend's call; replace this with its ranked list.
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

/**
 * @param {object} props
 * @param {Array<object>} props.recipes The backend's saved recipes.
 * @param {'loading'|'offline'|'error'|'stale'|'ready'} [props.state] Load state of the recipes
 *   (`getListLoadState`); the empty state only shows once they have loaded.
 * @param {unknown} [props.error]
 * @param {() => void} [props.onRetry]
 */
export default function TopRecipesList({ recipes, state = 'ready', error, onRetry }) {
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
    <div className="card-machined p-5 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={18} className="text-ink" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {copy.title}
        </h3>
      </div>
      <p className="mb-6 text-sm font-medium text-ink-muted">
        {copy.subtitle}
      </p>

      <div className="border border-ink/10">
        <ListLoadNotices state={state} label={copy.listLabel} error={error} onRetry={onRetry} />
        {state === 'loading' && <div className="divide-y divide-ink/10" aria-busy="true"><CardSkeletons rows={3} /></div>}
        {!hasRowsToShow(state) ? null : safeRecipes.length === 0 ? (
          <EmptyMixState />
        ) : (
          <table className="hidden min-w-[760px] w-full border-collapse text-left md:table">
            <thead className="bg-ink-100">
              <tr className="border-b border-ink/10">
                <th scope="col" className="w-20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.rank}</th>
                <th scope="col" className="min-w-[280px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.mixName}</th>
                <th scope="col" className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.dailyMilk}</th>
                <th scope="col" className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.costPerLitre}</th>
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
      {hasRowsToShow(state) && safeRecipes.length > 0 && <div className="space-y-3 md:hidden">
        {safeRecipes.map((recipe, index) => {
          const recipeId = recipe?.id;
          const perf = recipe?.performance ?? {};
          const yieldAvg = yieldOf(recipe);
          const costPerLiter = readFeedCostPerLitre(perf) ?? readFeedCostPerLitre(recipe);
          const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : Array.isArray(recipe?.formula) ? recipe.formula : [];
          const expanded = expandedId === recipeId;
          return <article key={recipeId || `mobile-${index}`} className="min-w-0 rounded-xl border border-ink/10 bg-surface p-4">
            <button type="button" onClick={() => handleToggle(recipeId)} aria-expanded={expanded} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
              <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{copy.rankN(index + 1)}</span><span className="mt-1 block break-words text-sm font-bold text-brand">{recipe?.name || copy.unnamed}</span></span>
              {expanded ? <ChevronUp className="shrink-0 text-brand" size={18} /> : <ChevronDown className="shrink-0 text-brand" size={18} />}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-raised p-3 text-xs">
              <div><p className="text-ink-muted">{copy.dailyMilk}</p><p className="mt-1 font-mono font-bold tabular-nums text-ink">{formatLitres(yieldAvg)}</p></div>
              <div><p className="text-ink-muted">{copy.costPerLitre}</p><p className="mt-1 font-mono font-bold tabular-nums text-ink">{formatCostPerLitre(costPerLiter)}</p></div>
            </div>
            {expanded && <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{copy.breakdown}</p>
              {ingredients.length ? ingredients.map((ingredient, ingredientIndex) => <div key={ingredientIndex} className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-words text-ink">{ingredient?.name ?? ingredient?.ingredient_name ?? ingredient?.ingredientName ?? copy.unknownIngredient}</span><span className="shrink-0 font-mono font-semibold text-ink">{shareOf(ingredient)}</span></div>) : <p className="text-xs text-ink-muted">{copy.noFormula}</p>}
              <p className="text-xs text-ink-muted">{copy.proteinLastFed(proteinOf(recipe), perf.lastFedOn ?? perf.last_fed_on ?? recipe?.lastUsed ?? copy.notRecorded)}</p>
              <button type="button" onClick={(event) => handleLoadRecipe(event, recipe)} className="w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">{copy.loadIntoLab}</button>
            </div>}
          </article>;
        })}
      </div>}
    </div>
  );
}
