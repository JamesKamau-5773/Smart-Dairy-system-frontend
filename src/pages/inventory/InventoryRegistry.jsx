import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Edit2, Package, Trash2, ChevronDown } from 'lucide-react';
import RegisterResourceModal from '../../components/inventory/RegisterResourceModal';
import StandardDeliveryModal from '../../components/inventory/StandardDeliveryModal';
import EditResourceModal from '../../components/inventory/EditResourceModal';

export default function InventoryRegistry() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Initialized as state so the UI updates immediately when editing or deleting
  const [inventoryData, setInventoryData] = useState([
    { name: 'Dairy Meal (Premium)', sku: 'FD-001', category: 'Bulk Feed', stock: { value: 850, unit: 'KG' }, status: 'HEALTHY' },
    { name: 'Silage Reserve', sku: 'FD-002', category: 'Bulk Feed', stock: { value: 120, unit: 'KG' }, status: 'CRITICAL' },
    { name: 'Penicillin V', sku: 'MED-001', category: 'Medical Vault', stock: { value: 12, unit: 'UNITS' }, status: 'HEALTHY' },
    { name: 'Dewormer (Albendazole)', sku: 'MED-002', category: 'Medical Vault', stock: { value: 1, unit: 'UNIT' }, status: 'CRITICAL' },
    { name: 'Milking Machine Liners', sku: 'EQ-104', category: 'Equipment', stock: { value: 45, unit: 'PCS' }, status: 'HEALTHY' },
    { name: 'Calf Pellets', sku: 'FD-005', category: 'Bulk Feed', stock: { value: 400, unit: 'KG' }, status: 'HEALTHY' },
  ]);

  // Add new resource to the inventory list
  const handleRegisterResource = (newResourceData) => {
    const newResource = {
      name: newResourceData.name,
      sku: newResourceData.sku,
      category: newResourceData.category,
      stock: { value: newResourceData.initialStock, unit: newResourceData.unit },
      status: 'HEALTHY', // Default status for new items
    };
    setInventoryData(prevData => [newResource, ...prevData]);
  };

  const categories = useMemo(() => {
    const allCategories = inventoryData.map(item => item.category);
    // Return a unique list of categories, with "All" at the beginning
    return ['All', ...new Set(allCategories)];
  }, [inventoryData]);

  const handleRestock = (item) => {
    setSelectedItem(item);
    setIsRestockModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  // Delete function to remove the item from state
  const handleDelete = (skuToDelete) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      setInventoryData(prevData => prevData.filter(item => item.sku !== skuToDelete));
    }
  };

  // Edit function to save updated data back to state
  const handleSaveEdit = (updatedItem) => {
    setInventoryData(prevData => 
      prevData.map(item => item.sku === updatedItem.sku ? updatedItem : item)
    );
  };

  // Restock function to update stock quantity in state
  const handleConfirmRestock = (itemToRestock, amount) => {
    setInventoryData(prevData =>
      prevData.map(item => {
        if (item.sku === itemToRestock.sku) {
          const newStockValue = item.stock.value + amount;
          return { ...item, stock: { ...item.stock, value: newStockValue } };
        }
        return item;
      })
    );
  };

  // Filter data based on search term
  const filteredInventoryData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return inventoryData.filter(item => {
      const matchesSearch = term ? 
        item.name.toLowerCase().includes(term) || 
        item.sku.toLowerCase().includes(term) : 
        true;
      
      const matchesCategory = categoryFilter === 'All' ? 
        true : 
        item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [inventoryData, searchTerm, categoryFilter]);

  return (
    <div className="animate-reveal p-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand/5 text-brand text-[10px] font-black uppercase tracking-widest mb-3 rounded-md border border-brand/10">
            <Package size={12} /> Resource Management
          </div>
          <h2 className="font-sans font-black text-3xl tracking-tight text-ink m-0">Stock Registry</h2>
          <p className="text-slate-500 font-bold text-sm mt-1">Manage stock levels, new receipts, and resource definitions.</p>
        </div>
        <button 
          onClick={() => setIsRegisterModalOpen(true)} 
          className="flex items-center px-5 py-2.5 bg-brand text-white rounded-lg font-black text-xs uppercase hover:bg-brand-dark transition-all shadow-sm"
        >
          <Plus size={14} className="mr-2" /> Add to Feedstore
        </button>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                placeholder="Search items by name or SKU..." 
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="relative">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-lg font-black text-xs uppercase text-slate-600 hover:bg-slate-50 appearance-none focus:outline-none focus:border-brand/50 cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
            >
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* STOCK TABLE */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500">
            <tr>
              <th className="px-6 py-4">Item Details</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Current Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventoryData.map((item) => (
              <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-black text-sm text-ink">{item.name}</div>
                  <div className="text-[11px] font-bold text-slate-400 font-mono">{item.sku}</div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-600">{item.category}</td>
                <td className="px-6 py-4 text-xs font-black text-ink">
                  {item.stock.value} <span className="text-slate-400">{item.stock.unit}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black px-2 py-1 rounded border ${
                    item.status === 'HEALTHY' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-red-50 text-red-600 border-red-100'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-1 flex justify-end items-center">
                  <button 
                    onClick={() => handleRestock(item)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase hover:bg-slate-200 transition-colors mr-2"
                  >
                    Restock
                  </button>
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 text-slate-400 hover:text-ink transition-colors"
                    title="Edit Item"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.sku)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALS SECTION */}
      <RegisterResourceModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        onRegister={handleRegisterResource}
      />
      
      <StandardDeliveryModal 
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        item={selectedItem}
        onRestock={handleConfirmRestock}
      />

      <EditResourceModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={selectedItem}
        onSave={handleSaveEdit}
      />
    </div>
  );
}