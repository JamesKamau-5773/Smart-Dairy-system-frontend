import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import { useTenant } from '../../hooks/useTenant';
import MixBuilder from '../../components/nutrition/MixBuilder';

export default function FeedFormulation() {
  const { tenantId, farmId } = useTenant();
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', tenantId, farmId],
    queryFn: () => apiClient.get('/inventory/status').then((r) => r.data),
  });

  // Normalize API shape: some backends return { items: [...] } or { data: [...] }
  const inventoryList = Array.isArray(inventory)
    ? inventory
    : (inventory && (Array.isArray(inventory.items) ? inventory.items : (Array.isArray(inventory.data) ? inventory.data : []))) || [];

  const savedBaseline = parseFloat(localStorage.getItem('baseline_herd_meal_kg') || '4.0');
  const savedItem = localStorage.getItem('baseline_inventory_item_id') || '';

  const [baseline, setBaseline] = useState(savedBaseline);
  const [inventoryItemId, setInventoryItemId] = useState(savedItem);
  const [message, setMessage] = useState('');

  const handleSave = (event) => {
    event.preventDefault();
    localStorage.setItem('baseline_herd_meal_kg', String(baseline));
    localStorage.setItem('baseline_inventory_item_id', inventoryItemId || '');
    setMessage('Saved baseline ration. Milk Lab will use this value by default.');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8 animate-reveal">
      <div className="border-b border-ink/10 pb-4">
        <h1 className="font-black text-3xl text-ink m-0">Feed Formulation</h1>
        <p className="text-sm text-ink-muted mt-2">
          Build feed batches by raw weight, snapshot ingredient prices, and keep Milk Lab aligned with the baseline ration.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <MixBuilder inventoryItems={inventoryList} isLoading={isLoading} />

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-ink/10 shadow-sm">
            <h2 className="font-black text-2xl text-ink m-0">Baseline ration</h2>
            <p className="text-sm text-ink-muted mt-2">Milk Lab still uses this as the default herd meal unless the farmer overrides it.</p>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-ink-muted mb-2">Baseline herd meal (kg per cow)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={baseline}
                  onChange={(event) => setBaseline(Number(event.target.value))}
                  className="input-machined w-full"
                />
                <p className="text-xs text-ink-muted mt-2">This value will be used by the Milk Lab calculator unless you override it there.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-ink-muted mb-2">Preferred concentrate item</label>
                <select
                  className="input-machined w-full"
                  value={inventoryItemId}
                  onChange={(event) => setInventoryItemId(event.target.value)}
                >
                  <option value="">-- Select from inventory --</option>
                  {isLoading ? (
                    <option>Loading…</option>
                  ) : (
                    inventoryList.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} — {item.unit}</option>
                    ))
                  )}
                </select>
                <p className="text-xs text-ink-muted mt-2">Optional: this is recorded as the default item for baseline rations.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-command bg-brand text-surface">Save</button>
                <Link to="/operations/lab" className="text-sm text-ink-muted underline">Open Milk Lab</Link>
                {message && <span className="text-sm text-brand font-medium">{message}</span>}
              </div>
            </form>
          </div>

          <div className="bg-brand/5 border border-brand/15 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand mb-3">Connected workflow</p>
            <p className="text-sm text-ink-muted leading-6">
              Save a feed batch here, then use the batch data to analyze milk yield, cost per liter, and future formula comparisons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
