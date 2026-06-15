import React, { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import CurrentMixCard from '../../components/nutrition/CurrentMixCard';
import ProfitabilityChart from '../../components/nutrition/ProfitabilityChart';
import TopRecipesList from '../../components/nutrition/TopRecipesList';
import ReceiveStockModal from '../../components/nutrition/ReceiveStockModal';

const MOCK_CURRENT_MIX = {
  name: 'High-Yield Lactation Mix',
  totalWeight: 500,
  consumedWeight: 380,
  remainingWeight: 120,
  dailyFeedingRate: 40,
  mixedOn: '2026-06-05',
};

const MOCK_TRENDS = [
  { week: 'Wk 18', cost: 15.2 },
  { week: 'Wk 19', cost: 14.8 },
  { week: 'Wk 20', cost: 12.5 },
  { week: 'Wk 21', cost: 11.8 },
  { week: 'Wk 22', cost: 11.2 },
];

const MOCK_RECIPES = [
  { id: 1, name: 'Dry Season High-Energy', costPerLiter: 11.2, yieldAvg: 28.5 },
  { id: 2, name: 'Wet Season Grass Balancer', costPerLiter: 12.45, yieldAvg: 26.0 },
  { id: 3, name: 'Standard Commercial Meal', costPerLiter: 15.8, yieldAvg: 24.2 },
];

const MOCK_STOCK = [
  { id: 'maize_germ', name: 'Maize Germ', unit: 'KG' },
  { id: 'wheat_bran', name: 'Wheat Bran', unit: 'KG' },
  { id: 'sunflower_cake', name: 'Sunflower Cake', unit: 'KG' },
];

export default function NutritionDashboard() {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const currentMix = useMemo(() => MOCK_CURRENT_MIX, []);
  const trends = useMemo(() => MOCK_TRENDS, []);
  const recipes = useMemo(() => MOCK_RECIPES, []);

  const handleReceiveStock = (delivery) => {
    // Hook for future mutation wiring.
    console.info('Received stock delivery', delivery);
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            Feed & Profit Tracker
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Feed Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-muted">
            Track the active batch, profitability, and recipe performance from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeliveryModalOpen(true)}
          className="btn-command flex items-center gap-2"
        >
          <PackagePlus size={18} /> Log Feed Delivery
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CurrentMixCard mix={currentMix} />
        <ProfitabilityChart trends={trends} />
      </div>

      <TopRecipesList recipes={recipes} />

      <ReceiveStockModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        inventoryItems={MOCK_STOCK}
        onReceive={handleReceiveStock}
      />
    </div>
  );
}