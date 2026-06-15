import React, { useState } from 'react';
import { 
  Database, AlertOctagon, PackagePlus, ArrowDownRight, 
  ArrowUpRight, Wheat, Syringe, HeartPulse, Search 
} from 'lucide-react';

export default function StockRegistry() {
  // Mock Data: Inventory Items (Categories simplified)
  const [inventory, setInventory] = useState([
    { id: 1, name: "Premium Dairy Meal", category: "Feed", unit: "Bags (70kg)", qty: 2.5, threshold: 5, icon: <Wheat size={16} /> },
    { id: 2, name: "Maclick Super Mineral", category: "Minerals", unit: "Kgs", qty: 12, threshold: 10, icon: <Database size={16} /> },
    { id: 3, name: "Friesian AI Straws (FR-889)", category: "Breeding", unit: "Straws", qty: 4, threshold: 3, icon: <Syringe size={16} /> },
    { id: 4, name: "Penstrep Antibiotic", category: "Medicine", unit: "Vials (100ml)", qty: 5, threshold: 2, icon: <HeartPulse size={16} /> },
    { id: 5, name: "Boma Rhodes Hay", category: "Feed", unit: "Bales", qty: 45, threshold: 20, icon: <Wheat size={16} /> }
  ]);

  // Derived State: Items below their minimum threshold
  const criticalStock = inventory.filter(item => item.qty <= item.threshold);

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
        <div className="p-4 border-b border-ink/10 flex items-center justify-between bg-surface-warm/30">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-9 pr-4 py-2 bg-surface border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Feed', 'Medicine', 'Breeding'].map(filter => (
              <button key={filter} className="px-3 py-1 text-xs font-bold text-ink-muted hover:bg-ink/5 rounded-md transition-colors">
                {filter}
              </button>
            ))}
          </div>
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
            {inventory.map((item) => {
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