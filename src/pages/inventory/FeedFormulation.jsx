import React, { useState } from 'react';
import { Beaker, Tractor, Save } from 'lucide-react';
import RecipeBuilder from '../nutrition/RecipeBuilder'; 

export default function FeedFormulation() {
  // Toggle between strategic modes
  const [activeTab, setActiveTab] = useState('dairy_meal');

  // Starting template for High-Protein Concentrate
  const dairyMealIngredients = [
    { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
    { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
    { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
  ];

  // Starting template for the Total Mixed Ration (incorporating the Dairy Meal)
  const mainMealIngredients = [
    { id: 'silage', name: 'Silage', percentage: 60, proteinContent: 8.0, pricePerKg: 5 },
    { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 },
    { id: 'lucerne', name: 'Lucerne Hay', percentage: 10, proteinContent: 18.0, pricePerKg: 25 }
  ];

  return (
    <div className="animate-reveal space-y-8 max-w-5xl mx-auto p-4 md:p-8">
      
      {/* Page Header */}
      <div className="border-b border-ink/10 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-ink">Nutrition Lab</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-2xl">
          Design high-yield concentrates and balance the herd's daily Total Mixed Ration (TMR). Saved formulas can be quickly logged on the Feed Dashboard.
        </p>
      </div>

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
          {activeTab === 'dairy_meal' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <RecipeBuilder recipeType="dairy_meal" initialIngredients={dairyMealIngredients} />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <RecipeBuilder recipeType="main_meal" initialIngredients={mainMealIngredients} />
            </div>
          )}
        </div>

        {/* Right Column: Strategic Actions & Context */}
        <div className="space-y-6">
          <div className="bg-surface p-6 border border-ink/5 rounded-card shadow-sm">
            <h4 className="text-sm font-black text-ink-strong mb-2">Save Formulation</h4>
            <p className="text-xs text-ink-muted mb-6">
              Lock in these percentages. This updates the baseline ration used by the Milk Lab to calculate profitability.
            </p>
            <button className="w-full bg-brand hover:bg-brand-dark text-white px-4 py-3 rounded-button font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
              <Save size={18} /> Save as Current Recipe
            </button>
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