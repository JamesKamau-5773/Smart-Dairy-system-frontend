import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, AlertOctagon, PackagePlus, ArrowDownRight, 
  ArrowUpRight, Wheat, Syringe, HeartPulse, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { inventoryApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

export default function StockRegistry() {
  const { tenantId, farmId } = useTenant();
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [controlsOpen, setControlsOpen] = useState(false);

  const { data: stockData } = useQuery({
    queryKey: ['stock-registry', tenantId, farmId],
    queryFn: () => inventoryApi.listStock(),
    enabled: !!tenantId && !!farmId,
  });

  React.useEffect(() => {
    if (Array.isArray(stockData)) {
      setInventory(stockData.map((item) => ({
        id: item.id ?? item.itemId ?? `stock-${Date.now()}`,
        name: item.name ?? item.item_name ?? 'Unnamed Item',
        sku: item.sku ?? item.item_code ?? item.code ?? '',
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
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button className="btn-command flex w-full items-center justify-center gap-2 border border-ink/20 bg-surface text-sm text-ink hover:bg-surface-raised sm:w-auto">
            <ArrowDownRight size={16} className="text-brand" /> Record Usage
          </button>
          <button className="btn-command flex w-full items-center justify-center gap-2 text-sm sm:w-auto">
            <PackagePlus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* CRITICAL ALERTS (Only visible if stock is low) */}
      {criticalStock.length > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand-50 p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-brand-dark">
            <AlertOctagon size={20} /> Items Running Out
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalStock.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-surface p-4">
                <div>
                  <div className="font-bold text-ink text-sm">{item.name}</div>
                  <div className="mt-1 font-mono text-xs text-brand-dark">
                    Left: {item.qty} {item.unit}
                  </div>
                </div>
                <button className="rounded bg-brand px-3 py-1.5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-brand-dark">
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink  transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
              >
                {controlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {controlsOpen ? 'Hide filters' : 'Show filters'}
              </button>
            </div>
          </div>

          {controlsOpen && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-64">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="w-full rounded-lg border border-ink/10 bg-surface py-2 pl-10 pr-4 text-sm focus:border-brand/50 focus:outline-none transition-colors"
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
        <table className="hidden w-full text-left md:table">
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
                        <span className="inline-flex items-center gap-1.5 rounded bg-brand/10 px-2 py-1 text-[10px] font-bold uppercase text-brand-dark">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-dark"></span> Empty!
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1.5 rounded bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase text-brand-dark">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-700"></span> Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded bg-brand/10 px-2 py-1 text-[10px] font-bold uppercase text-brand">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand"></span> Good
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
        <div className="divide-y divide-ink/10 md:hidden">
          {visibleInventory.map((item) => {
            const isLow = item.qty <= item.threshold;
            const isWarning = item.qty <= (item.threshold * 1.5) && !isLow;
            const status = isLow ? 'Critical' : isWarning ? 'Low stock' : 'Healthy';
            return (
            <article key={item.id} className="min-w-0 space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-brand">{item.name}</h3>
                  {item.sku && <p className="mt-1 break-words font-mono text-xs text-ink-muted">{item.sku}</p>}
                  </div>
                  <span className="shrink-0 rounded border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase text-brand-dark">{status}</span>
                </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-xs">
                <div className="min-w-0"><dt className="text-ink-muted">Stock</dt><dd className="mt-1 break-words font-mono font-bold tabular-nums text-ink">{item.qty} {item.unit}</dd></div>
                <div className="min-w-0"><dt className="text-ink-muted">Category</dt><dd className="mt-1 break-words font-semibold text-ink">{item.category}</dd></div>
              </dl>
              <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
                <p className="text-xs text-ink-muted">Minimum: {item.threshold} {item.unit}</p>
                <button type="button" className="min-h-10 shrink-0 rounded-lg border border-brand/20 px-3 text-sm font-semibold text-brand hover:bg-brand-50">Past Records</button>
              </div>
              </article>
            );
          })}
          {visibleInventory.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No inventory items match these filters.</p>}
        </div>
      </div>
    </div>
  );
}
