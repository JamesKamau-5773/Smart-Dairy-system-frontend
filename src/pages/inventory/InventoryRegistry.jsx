// src/pages/inventory/InventoryRegistry.jsx
import React, { useState, useMemo } from 'react';
import { Database, Plus, Download, Search, Filter, Edit, AlertOctagon } from 'lucide-react';
import StandardDeliveryModal from '../../components/inventory/StandardDeliveryModal';

// ----------------------------------------------------------------------
// MOCK DATA (Replaces Backend Call)
// ----------------------------------------------------------------------
const MOCK_INVENTORY = [
  { id: 1, name: 'Dairy Meal (Premium)', sku: 'FD-001', category: 'Bulk Feed', stock: 850, capacity: 1000, unit: 'KG', type: 'bulk' },
  { id: 2, name: 'Silage Reserve', sku: 'FD-002', category: 'Bulk Feed', stock: 120, capacity: 2000, unit: 'KG', type: 'bulk' },
  { id: 3, name: 'Penicillin V', sku: 'MED-001', category: 'Medical Vault', stock: 12, capacity: null, unit: 'units', type: 'controlled' },
  { id: 4, name: 'Dewormer (Albendazole)', sku: 'MED-002', category: 'Medical Vault', stock: 1, capacity: null, unit: 'unit', type: 'controlled' },
  { id: 5, name: 'Milking Machine Liners', sku: 'EQ-104', category: 'Equipment', stock: 45, capacity: 50, unit: 'pcs', type: 'equipment' },
  { id: 6, name: 'Calf Pellets', sku: 'FD-005', category: 'Bulk Feed', stock: 400, capacity: 500, unit: 'KG', type: 'bulk' },
];

// ----------------------------------------------------------------------
// 1. STATUS BADGE COMPONENT 
// ----------------------------------------------------------------------
function StatusBadge({ item }) {
  const ratio = item.capacity ? (item.stock / item.capacity) : (item.stock / 20); 
  
  if (ratio < 0.15 || (item.type === 'controlled' && item.stock <= 2)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-widest bg-danger/5 text-danger border border-danger/10">
        <AlertOctagon size={12} strokeWidth={2.5} /> Critical
      </span>
    );
  }
  
  if (ratio < 0.40 || (item.type === 'controlled' && item.stock <= 5)) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-widest bg-[#FFF4E5] text-[#B26B00] border border-[#FFE0B2]">
        Low Stock
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-widest bg-brand/5 text-brand border border-brand/10">
      Healthy
    </span>
  );
}

// ----------------------------------------------------------------------
// 2. INVENTORY ROW COMPONENT 
// ----------------------------------------------------------------------
function InventoryRow({ item, onRestock }) {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
      <td className="px-8 py-5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-black text-ink-strong tracking-tight">{item.name}</span>
          <span className="text-[11px] font-bold text-ink-muted mt-0.5">{item.sku}</span>
        </div>
      </td>
      <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-ink-muted">
        {item.category}
      </td>
      <td className="px-8 py-5 whitespace-nowrap text-right">
        <div className="text-sm font-black text-ink tabular-nums tracking-tight">
          {item.stock} <span className="text-[10px] font-bold text-ink-muted uppercase">{item.unit}</span>
        </div>
        {item.capacity && (
          <div className="text-[10px] font-bold text-ink-muted uppercase mt-0.5">
            / {item.capacity} {item.unit}
          </div>
        )}
      </td>
      <td className="px-8 py-5 whitespace-nowrap text-center">
        <StatusBadge item={item} />
      </td>
      <td className="px-8 py-5 whitespace-nowrap text-right">
        {/* Actions are now always visible */}
        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={() => onRestock(item)}
            className="text-brand hover:text-white font-bold text-xs bg-brand/10 hover:bg-brand px-4 py-2.5 rounded-[10px] transition-all"
          >
            Restock
          </button>
          <button className="text-ink-muted hover:text-brand p-2.5 rounded-[10px] hover:bg-brand/5 transition-colors">
            <Edit size={16} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------
// 3. DETACHED TOOLBAR COMPONENT 
// ----------------------------------------------------------------------
function InventoryToolbar({ searchTerm, onSearchChange, categoryFilter, onCategoryChange }) {
  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-5 items-center justify-between mb-6">
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted/50" size={18} strokeWidth={2.5} />
        <input 
          type="text" 
          placeholder="Search items by name or SKU..." 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-[12px] focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm text-ink font-bold transition-all placeholder:text-ink-muted/40 outline-none"
        />
      </div>
      <div className="flex items-center w-full sm:w-auto relative">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted/50 pointer-events-none" size={16} strokeWidth={2.5} />
        <select 
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full sm:w-auto appearance-none pl-11 pr-10 py-3 border border-slate-200 rounded-[12px] focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm text-ink font-black transition-all cursor-pointer outline-none bg-white"
        >
          <option value="All">All Categories</option>
          <option value="Bulk Feed">Bulk Feed</option>
          <option value="Medical Vault">Medical Vault</option>
          <option value="Equipment">Equipment</option>
        </select>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. MAIN REGISTRY COMPONENT
// ----------------------------------------------------------------------
export default function InventoryRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);

  // Using Mock Data instead of useQuery for now
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const isLoading = false;

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, categoryFilter]);

  // Handler for specific row restock
  const handleRestockClick = (item) => {
    setSelectedRestockItem(item);
    setIsRestockModalOpen(true);
  };

  // Handler for generic Add to Feedstore
  const handleAddToFeedstoreClick = () => {
    setSelectedRestockItem(null); 
    setIsRestockModalOpen(true);
  };

  return (
    <div className="animate-reveal space-y-8 bg-[#F4F7F9] min-h-screen p-8">
      
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-ink/5 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/5 text-brand text-[10px] font-black uppercase tracking-widest rounded-[8px] border border-brand/10 mb-3">
            <Database size={12} strokeWidth={2.5} /> Resource Management
          </div>
          <h2 className="font-sans font-black text-3xl tracking-tight text-ink m-0">Stock Registry</h2>
          <p className="text-xs font-bold text-ink-muted mt-1.5">Manage standard stock levels, deliveries, and adjustments.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
          <button className="bg-white border border-slate-200 text-ink px-5 py-3 rounded-[12px] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all flex-1 md:flex-none">
            <Download size={14} strokeWidth={2.5} /> Export
          </button>
          <button 
            onClick={handleAddToFeedstoreClick}
            className="bg-brand text-white hover:bg-[#1546b3] px-5 py-3 rounded-[12px] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all flex-1 md:flex-none"
          >
            <Plus size={14} strokeWidth={3} /> Add to Feedstore
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div>
        <InventoryToolbar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          categoryFilter={categoryFilter} 
          onCategoryChange={setCategoryFilter} 
        />

        <div className="bg-white border border-slate-100 rounded-[24px] shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#F8FAFC] border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-ink-muted uppercase tracking-widest">Item Details</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-ink-muted uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-ink-muted uppercase tracking-widest">Current Stock</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-ink-muted uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-ink-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {!isLoading && filteredInventory.map((item) => (
                <InventoryRow 
                  key={item.id} 
                  item={item} 
                  onRestock={handleRestockClick} 
                />
              ))}
            </tbody>
          </table>
          
          {!isLoading && filteredInventory.length === 0 && (
            <div className="text-center py-24 flex flex-col items-center justify-center">
              <div className="bg-brand/5 p-6 rounded-full mb-6 border border-brand/10">
                <Database className="text-brand/40" size={40} strokeWidth={2} />
              </div>
              <p className="text-ink font-black text-xl tracking-tight">No items found</p>
              <p className="text-ink-muted text-sm font-bold mt-2">Try adjusting your search or category filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <StandardDeliveryModal 
        isOpen={isRestockModalOpen} 
        onClose={() => setIsRestockModalOpen(false)} 
        item={selectedRestockItem} 
      />
    </div>
  );
}