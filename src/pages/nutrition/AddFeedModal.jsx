import React, { useState } from 'react';
import { X, Beaker, Tractor } from 'lucide-react';
import RecipeBuilder from './RecipeBuilder'; 

const CUSTOM_FORMULATIONS = {
  dairy_meal: {
    label: 'Dairy Meal (Concentrate)',
    ingredients: [
      { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
      { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
      { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
    ],
  },
  main_meal: {
    label: 'Main Meal (TMR)',
    ingredients: [
      { id: 'silage', name: 'Silage', percentage: 60, proteinContent: 8.0, pricePerKg: 5 },
      { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 },
      { id: 'lucerne', name: 'Lucerne Hay', percentage: 10, proteinContent: 18.0, pricePerKg: 25 }
    ],
  },
};

export default function AddFeedModal({ onClose }) {
  const [activeCustomTab, setActiveCustomTab] = useState('dairy_meal');
  const currentFormulation = CUSTOM_FORMULATIONS[activeCustomTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-modal shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* ── HEADER ── */}
        <div className="flex justify-between items-center p-6 border-b border-ink/5 bg-white shrink-0">
          <h2 className="text-lg font-black text-ink-strong flex items-center gap-2">
            <Beaker className="text-brand" size={20} /> Formulate Custom Mix
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-raised text-ink-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="p-6 overflow-y-auto">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* TABS */}
            <div className="mb-6 rounded-lg border border-ink/5 bg-surface-raised p-1.5 shadow-sm">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveCustomTab('dairy_meal')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-all ${
                    activeCustomTab === 'dairy_meal'
                      ? 'bg-white text-brand shadow-sm border border-ink/5'
                      : 'text-ink-muted hover:text-ink-strong'
                  }`}
                >
                  <Beaker size={18} /> {CUSTOM_FORMULATIONS.dairy_meal.label}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCustomTab('main_meal')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-all ${
                    activeCustomTab === 'main_meal'
                      ? 'bg-white text-brand shadow-sm border border-ink/5'
                      : 'text-ink-muted hover:text-ink-strong'
                  }`}
                >
                  <Tractor size={18} /> {CUSTOM_FORMULATIONS.main_meal.label}
                </button>
              </div>
            </div>

            {/* RECIPE BUILDER COMPONENT */}
            <RecipeBuilder
              key={activeCustomTab}
              recipeType={activeCustomTab}
              initialIngredients={currentFormulation.ingredients}
            />
            
            {/* FOOTER ACTIONS */}
            <div className="flex justify-end items-center mt-6 pt-6 border-t border-ink/5 gap-4">
              <button 
                onClick={onClose} 
                className="text-sm font-bold text-ink-muted hover:text-ink-strong transition-colors px-4 py-2"
              >
                Cancel
              </button>
              <button className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-button font-bold text-sm transition-colors shadow-sm">
                Save & Mix Batch
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}