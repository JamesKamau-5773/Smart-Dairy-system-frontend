import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, AlertOctagon, PackagePlus, ArrowDownRight, 
  ArrowUpRight, Wheat, Syringe, HeartPulse, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { inventoryApi } from '../../lib/backendApi';

export default function StockRegistry() {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [controlsOpen, setControlsOpen] = useState(false);

  const { data: stockData } = useQuery({
    queryKey: ['stock-registry'],
    queryFn: () => inventoryApi.listStock(),
  });

  React.useEffect(() => {
    if (Array.isArray(stockData)) {
      setInventory(stockData.map((item) => ({
        id: item.id ?? item.itemId ?? `stock-${Date.now()}`,
        name: item.name ?? item.item_name ?? 'Unnamed Item',
        category: item.category ?? item.type ?? 'All',
        unit: item.unit ?? item.uom ?? '',
        qty: Number(item.qty ?? item.quantity ?? item.balance ?? 0),
        threshold: Number(item.threshold ?? item.minimum ?? 0),
      })));
    }
  }, [stockData]);

  const visibleInventory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch = !normalizedSearch || [item.name, item.category, item.unit].some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, categoryFilter]);

  // Derived State: Items below their minimum threshold
  const criticalStock = visibleInventory.filter(item => item.qty <= item.threshold);
  const activeFilterCount = [searchTerm.trim(), categoryFilter !== 'All'].filter(Boolean).length;

  return (
    <div className="animate-reveal space-y-8 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Database size={12} /> Farm Supplies
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            My <span className="text-ink-muted">Inventory</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Keep track of your feed, medicines, and daily farm supplies.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-command bg-surface border border-ink/20 text-ink flex items-center gap-2 text-sm shadow-sm hover:bg-surface-raised">
            <ArrowDownRight size={16} className="text-danger" /> Record Usage
          </button>
          <button className="btn-command flex items-center gap-2 text-sm shadow-sm">
            <PackagePlus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* CRITICAL ALERTS (Only visible if stock is low) */}
      {criticalStock.length > 0 && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6">
          <h3 className="font-bold text-danger flex items-center gap-2 mb-4">
            <AlertOctagon size={20} /> Items Running Out
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalStock.map(item => (
              <div key={item.id} className="bg-surface p-4 rounded-lg border border-danger/20 flex justify-between items-center">
                <div>
                  <div className="font-bold text-ink text-sm">{item.name}</div>
                  <div className="text-xs text-danger font-mono mt-1">
                    Left: {item.qty} {item.unit}
                  </div>
                </div>
                <button className="text-[10px] uppercase font-bold bg-danger text-white px-3 py-1.5 rounded hover:bg-danger-dark transition-colors">
                  Order More
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN INVENTORY TABLE */}
      <div className="card-machined bg-surface overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-ink/10 bg-surface-warm/30 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                <Search size={12} /> Search and filters
              </div>
              <p className="mt-1 text-sm leading-6 text-ink-muted">Narrow the inventory by item name, unit, or supply category.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-ink/10 bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                {activeFilterCount} active
              </span>
              <button
                type="button"
                onClick={() => setControlsOpen((current) => !current)}
                aria-expanded={controlsOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
              >
                {controlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {controlsOpen ? 'Hide filters' : 'Show filters'}
              </button>
            </div>
          </div>

          {controlsOpen && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-brand/50 transition-colors"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Feed', 'Medicine', 'Breeding'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setCategoryFilter(filter)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      categoryFilter === filter
                        ? 'bg-brand text-surface'
                        : 'text-ink-muted hover:bg-ink/5'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <table className="w-full text-left">
          <thead className="bg-surface text-ink-muted border-b border-ink/10">
            <tr>
              <th className="p-4 text-[10px] uppercase font-bold tracking-wider">Item Name</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-wider">Type</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-wider">Amount Left</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-wider">Status</th>
              <th className="p-4 text-[10px] uppercase font-bold tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {visibleInventory.map((item) => {
              const isLow = item.qty <= item.threshold;
              const isWarning = item.qty <= (item.threshold * 1.5) && !isLow;
              
              return (
                <tr key={item.id} className="hover:bg-surface-warm/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-brand flex items-center gap-2">
                      <span className="text-ink/40">{item.icon}</span> {item.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-mono text-ink-muted bg-surface-raised px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-lg font-bold text-ink">
                      {item.qty} <span className="text-xs font-normal text-ink-muted">{item.unit}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-danger/10 text-danger text-[10px] font-bold uppercase rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span> Empty!
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-accent/20 text-accent-dark text-[10px] font-bold uppercase rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand/10 text-brand text-[10px] font-bold uppercase rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span> Good
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-brand font-bold text-sm hover:underline">Past Records</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}