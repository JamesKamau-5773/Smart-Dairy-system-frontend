import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Beaker, Tractor, Save, AlertCircle, XCircle } from 'lucide-react';
import RecipeBuilder from '../nutrition/RecipeBuilder'; 

// 1. CRITICAL FIX: Define defaults OUTSIDE the component.
// This ensures their memory reference never changes, preventing infinite loops in child components.
const DEFAULT_DAIRY_MEAL = [
  { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
  { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
  { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
];

const DEFAULT_MAIN_MEAL = [
  { id: 'silage', name: 'Silage', percentage: 60, proteinContent: 8.0, pricePerKg: 5 },
  { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 },
  { id: 'lucerne', name: 'Lucerne Hay', percentage: 10, proteinContent: 18.0, pricePerKg: 25 }
];

export default function FeedFormulation() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 2. CRITICAL FIX: Ultra-safe router state extraction
  // Handles cases where the user clicks the Sidebar link and location.state is completely null
  const routerState = location.state || {};
  const importedDraft = routerState.isImportedDraft ? routerState : null;

  // State initialization
  const [activeTab, setActiveTab] = useState(importedDraft?.draftType || 'dairy_meal');

  // Synchronize the tab if a new draft is loaded while the component is already open
  useEffect(() => {
    if (importedDraft?.draftType) {
      setActiveTab(importedDraft.draftType);
    }
  }, [importedDraft?.draftType]);

  // 3. CRITICAL FIX: Safe, explicit resolution of which ingredients to pass
  let activeIngredients = activeTab === 'dairy_meal' ? DEFAULT_DAIRY_MEAL : DEFAULT_MAIN_MEAL;

  if (importedDraft && importedDraft.draftType === activeTab) {
    const draftData = importedDraft.draftFormula;
    if (Array.isArray(draftData) && draftData.length > 0) {
      activeIngredients = draftData;
    }
  }

  // Mock Save Mutation
  const saveRecipe = useMutation({
    mutationFn: async (payload) => {
      // Simulate API call to save the active formula
      return new Promise(resolve => setTimeout(resolve, 800));
    },
    onSuccess: () => {
      // Clear the draft state from the URL so a refresh doesn't reload it
      if (importedDraft) {
        navigate(location.pathname, { replace: true, state: {} });
      }
      // Safe object syntax for React Query v4/v5 compatibility
      queryClient.invalidateQueries({ queryKey: ['active-feed-recipe'] });
    }
  });

  const handleDiscardDraft = () => {
    // Clear router state to exit draft mode
    navigate(location.pathname, { replace: true, state: {} });
  };

  // Safe unique key to force remounts only when necessary
  const builderKey = `${activeTab}-${location.key || 'static'}`;

  return (
    <div className="animate-reveal space-y-8 max-w-5xl mx-auto p-4 md:p-8">
      
      {/* Page Header */}
      <div className="border-b border-ink/10 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-ink">Nutrition Lab</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-2xl">
          Design high-yield concentrates and balance the herd's daily Total Mixed Ration (TMR). Saved formulas can be quickly logged on the Feed Dashboard.
        </p>
      </div>

      {/* ⚠️ DRAFT WARNING BANNER */}
      {importedDraft && (
        <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-warning-dark shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-warning-dark text-sm">Draft Mode Active</h4>
            <p className="text-sm font-medium text-ink/70 mt-1">
              You are editing an imported feed mix. These changes are in a sandbox and will not affect the herd until you click "Save as Current Recipe".
            </p>
          </div>
        </div>
      )}

      {/* Strategic Toggle Tabs */}
      <div className="flex p-1.5 bg-surface-raised border border-ink/5 rounded-lg max-w-md shadow-sm">
        <button
          onClick={() => setActiveTab('dairy_meal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
            activeTab === 'dairy_meal' 
              ? 'bg-white text-brand shadow-sm border border-ink/5' 
              : 'text-ink-muted hover:text-ink-strong'
          }`}
        >
          <Beaker size={18} /> Dairy Meal (Concentrate)
        </button>
        <button
          onClick={() => setActiveTab('main_meal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
            activeTab === 'main_meal' 
              ? 'bg-white text-brand shadow-sm border border-ink/5' 
              : 'text-ink-muted hover:text-ink-strong'
          }`}
        >
          <Tractor size={18} /> Main Meal (TMR)
        </button>
      </div>

      {/* The Formulation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: The Interactive Builder */}
        <div className="lg:col-span-2">
          <div key={builderKey} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <RecipeBuilder 
              recipeType={activeTab} 
              initialIngredients={activeIngredients} 
            />
          </div>
        </div>

        {/* Right Column: Strategic Actions & Context */}
        <div className="space-y-6">
          <div className="bg-surface p-6 border border-ink/5 rounded-card shadow-sm">
            <h4 className="text-sm font-black text-ink-strong mb-2">Save Formulation</h4>
            <p className="text-xs text-ink-muted mb-6">
              Lock in these percentages. This updates the baseline ration used by the Milk Lab to calculate profitability.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => saveRecipe.mutate()}
                disabled={saveRecipe.isPending}
                className="w-full bg-brand hover:bg-brand-dark text-white px-4 py-3 rounded-button font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={18} /> 
                {saveRecipe.isPending ? 'Saving...' : 'Save as Current Recipe'}
              </button>

              {importedDraft && (
                <button 
                  onClick={handleDiscardDraft}
                  className="w-full bg-surface-raised hover:bg-ink/5 text-ink-strong px-4 py-3 rounded-button font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} className="text-danger" /> Discard Draft
                </button>
              )}
            </div>
          </div>

          <div className="bg-brand/5 p-6 border border-brand/20 rounded-card">
            <h4 className="text-sm font-black text-brand-dark mb-2">Did you know?</h4>
            <p className="text-xs text-brand-dark/80 leading-relaxed">
              When mixing a Total Mixed Ration (TMR), maintaining moisture around 45-50% prevents the cows from sorting and leaving behind the less palatable roughages.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}