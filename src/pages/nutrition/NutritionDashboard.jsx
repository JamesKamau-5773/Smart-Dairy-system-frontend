import React, { useMemo, useState } from 'react';
import { PackagePlus, Wheat } from 'lucide-react';
import CurrentMixCard from '../../components/nutrition/CurrentMixCard';
import ProfitabilityChart from '../../components/nutrition/ProfitabilityChart';
import TopRecipesList from './TopRecipesList';
import AddFeedModal from './AddFeedModal';

// Updated Mock Data with Farmer-Friendly Language
const MOCK_CURRENT_MIX = {
  name: 'Milking Cow Meal', // Simplified
  totalWeight: 500,
  consumedWeight: 380,
  remainingWeight: 120,
  dailyFeedingRate: 40,
  mixedOn: '2026-06-05',
};

const MOCK_TRENDS = [
  { week: 'Wk 18', cost: 15.2, height: 'h-24' },
  { week: 'Wk 19', cost: 14.8, height: 'h-20' },
  { week: 'Wk 20', cost: 12.5, height: 'h-16' },
  { week: 'Wk 21', cost: 11.8, height: 'h-12' },
  { week: 'Wk 22', cost: 11.2, height: 'h-10', isCurrent: true },
];

// Added 'type' and 'formula' payloads to fuel the Nutrition Lab draft state
const MOCK_RECIPES = [
  { 
    id: 1, 
    name: 'Dry Season High-Energy', 
    costPerLiter: 11.2, 
    yieldAvg: 28.5,
    type: 'dairy_meal',
    formula: null // Matches the screenshot: "No formula data available for this mix."
  },
  { 
    id: 2, 
    name: 'Wet Season Grass Balancer', 
    costPerLiter: 12.45, 
    yieldAvg: 26.0,
    type: 'main_meal',
    formula: [
      { id: 'silage', name: 'Silage', percentage: 55, proteinContent: 8.0, pricePerKg: 5 },
      { id: 'lucerne', name: 'Lucerne Hay', percentage: 15, proteinContent: 18.0, pricePerKg: 25 },
      { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 }
    ]
  },
  { 
    id: 3, 
    name: 'Standard Commercial Meal', 
    costPerLiter: 15.8, 
    yieldAvg: 24.2,
    type: 'dairy_meal',
    formula: [
      { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
      { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
      { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
    ]
  },
];

export default function NutritionDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentMix = useMemo(() => MOCK_CURRENT_MIX, []);
  const trends = useMemo(() => MOCK_TRENDS, []);
  const recipes = useMemo(() => MOCK_RECIPES, []);

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Wheat size={12} /> Feed & Profit Tracker
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Feed Store & Costs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
            Keep track of what's in the store, how much it costs, and which mixes give you the most milk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-command flex items-center gap-2 bg-brand text-surface shadow-md hover:bg-brand-dark transition-colors px-4 py-2.5 rounded-button font-bold text-sm"
        >
          <PackagePlus size={18} /> Mix New Batch
        </button>
      </div>

      {/* ── TOP GRID: STATUS & FINANCIALS ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CurrentMixCard mix={currentMix} />
        <ProfitabilityChart trends={trends} />
      </div>

      {/* ── BOTTOM SECTION: HISTORICAL PLAYBOOK ── */}
      <TopRecipesList recipes={recipes} />

      {/* ── MODAL ── */}
      {isModalOpen && (
        <AddFeedModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}