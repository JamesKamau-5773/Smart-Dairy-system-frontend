import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SRP: Handles ONLY the friendly empty state for the farmer.
 */
const EmptyMixState = () => (
  <div className="bg-surface-raised rounded-xl border border-ink/5 p-8 flex flex-col items-center justify-center text-center">
    <Info className="w-8 h-8 text-ink-muted mb-3 opacity-50" />
    <h4 className="text-ink-strong font-semibold mb-1">No feed records found</h4>
    <p className="text-sm text-ink-muted max-w-sm">
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
  const yieldAvg = recipe?.yieldAvg ?? 0;
  const costPerLiter = recipe?.costPerLiter ?? 0;
  
  // Safely check for either 'ingredients' or 'formula' depending on the payload shape
  const ingredientsList = Array.isArray(recipe?.ingredients) 
    ? recipe.ingredients 
    : (Array.isArray(recipe?.formula) ? recipe.formula : []);
    
  // The recipes API returns `target_protein_percentage`; fall back to `protein`.
  const protein = recipe?.target_protein_percentage ?? recipe?.protein ?? '--';
  const lastUsed = recipe?.lastUsed || 'Not recorded';

  return (
    <div className="bg-surface-raised rounded-lg transition-all duration-200 border border-transparent hover:border-ink/10 overflow-hidden shadow-sm">
      <button 
        type="button"
        onClick={() => onToggle(recipeId)}
        className="w-full flex items-center justify-between p-4 cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4">
          <span className="text-brand/50 font-black text-lg w-6 text-center">
            {index + 1}.
          </span>
          <div>
            <h4 className="font-bold text-ink-strong text-sm">{name}</h4>
            <p className="text-xs font-medium text-ink-muted mt-0.5">
              Daily Milk Average: <span className="text-ink-strong">{yieldAvg.toFixed(1)} L</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-3 py-1.5 rounded-md border border-ink/5 shadow-sm hidden sm:block">
            <span className="text-xs font-black text-ink-strong tracking-wide">
              KES {costPerLiter.toFixed(2)} / L
            </span>
          </div>
          <div className="text-ink-muted hover:text-ink-strong transition-colors p-1">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="px-4 pb-5 pt-2 animate-in slide-in-from-top-2 duration-200">
          <div className="border-t border-ink/5 pt-4 flex flex-col sm:flex-row gap-6 sm:gap-12">
            
            {/* Left: Ingredient List */}
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-3">
                Formula Breakdown
              </p>
              <div className="space-y-2">
                {ingredientsList.length > 0 ? (
                  ingredientsList.map((ing, idx) => {
                    const ingName = ing?.name ?? ing?.ingredient_name ?? ing?.ingredientName ?? 'Unknown Ingredient';
                    const ingPct = Number(ing?.percentage ?? ing?.inclusion_percentage ?? ing?.inclusionPercentage ?? 0);
                    return (
                      <div key={idx} className="flex items-center text-sm">
                        <span className="text-ink-strong flex-1">{ingName}</span>
                        <div className="flex-1 border-b border-dotted border-ink/20 mx-3 opacity-50"></div>
                        <span className="font-bold text-ink-strong">{ingPct}%</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-ink-muted italic">No formula data available for this mix.</p>
                )}
              </div>
            </div>

            {/* Right: Stats & Lab Link */}
            <div className="sm:w-48 shrink-0 flex flex-col justify-between">
              <div className="flex gap-6 mb-4 sm:mb-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-1">Protein</p>
                  <p className="text-sm font-bold text-ink-strong">{protein}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-1">Last Fed</p>
                  <p className="text-sm font-bold text-ink-strong">{lastUsed}</p>
                </div>
              </div>

              <button 
                type="button"
                // Pass the ENTIRE recipe object up to the handler
                onClick={(e) => onLoadToLab(e, recipe)}
                className="text-brand hover:text-brand/80 text-sm font-bold flex items-center gap-1.5 transition-colors group mt-2 w-fit"
              >
                Load into Lab 
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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

function selectTopMixes(recipes) {
  const latestByFormula = new Map();
  for (const recipe of recipes) {
    if (!recipe) continue;
    const key = formulaKeyOf(recipe);
    const existing = latestByFormula.get(key);
    if (!existing || getRecency(recipe) >= getRecency(existing)) {
      latestByFormula.set(key, recipe);
    }
  }
  return [...latestByFormula.values()]
    .sort((a, b) => getRecency(b) - getRecency(a))
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
    <div className="bg-surface p-6 md:p-8 rounded-card border border-ink/5 shadow-sm mt-8">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={18} className="text-brand" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-ink-strong">
          Best Performing Feed Mixes
        </h3>
      </div>
      <p className="text-sm font-medium text-ink-muted mb-6">
        The feed mixes giving you the most milk for the least amount of money.
      </p>

      <div className="space-y-3">
        {safeRecipes.length === 0 ? (
          <EmptyMixState />
        ) : (
          safeRecipes.map((recipe, index) => (
            <FeedMixRow
              key={recipe?.id || `fallback-${index}`}
              recipe={recipe}
              index={index}
              isExpanded={expandedId === recipe?.id}
              onToggle={handleToggle}
              onLoadToLab={handleLoadRecipe}
            />
          ))
        )}
      </div>
    </div>
  );
}