// src/components/inventory/RegisterResourceModal.jsx
import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Check } from 'lucide-react';

const INITIAL_STATE = { name: '', sku: '', category: 'Bulk Feed', unit: 'KG', currentStock: 0, reorderLevel: 10 };

export default function RegisterResourceModal({ isOpen, onClose, onRegister }) {
  const [formData, setFormData] = useState(INITIAL_STATE);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_STATE);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-ink text-lg tracking-tight">Register New Resource</h3>
            <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={20} /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Resource Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sunflower Cake" className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">SKU / Code</label>
                <input required name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. FD-006" className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none bg-white appearance-none">
                <option value="Bulk Feed">Bulk Feed</option>
                <option value="Medical Vault">Medical Vault</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Current Stock</label>
                <input required name="currentStock" value={formData.currentStock} onChange={handleChange} type="number" min="0" className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Unit</label>
                <input required name="unit" value={formData.unit} onChange={handleChange} placeholder="e.g. KG, PCS" className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Re-order Level</label>
              <input required name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} type="number" min="0" placeholder="e.g. 20" className="w-full p-3 border border-slate-200 rounded-[12px] text-sm font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
              <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">When stock falls to this level, it will be marked as 'CRITICAL'.</p>
            </div>

            <button type="submit" className="w-full py-4 mt-4 bg-brand text-white rounded-[12px] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors">
              <Check size={16} /> Save Resource
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}