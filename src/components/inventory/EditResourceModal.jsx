import React, { useState, useEffect } from 'react';
import { X, Save, Edit2 } from 'lucide-react';

export default function EditResourceModal({ isOpen, onClose, item, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: ''
    // reorderLevel will be added by useEffect
  });

  // Pre-fill the form whenever the modal opens with a selected item
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        category: item.category || 'Bulk Feed',
        reorderLevel: item.reorderLevel === undefined ? 0 : item.reorderLevel
      });
    }
  }, [item, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the merged data back to the parent so the table updates
    onSave({ ...item, ...formData });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-slate-200 p-2 rounded-lg text-slate-600">
              <Edit2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-ink text-sm uppercase tracking-widest">Edit Resource</h3>
              <p className="text-[10px] font-bold text-ink-muted uppercase mt-0.5">Modify Definition</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-muted hover:text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Resource Name</label>
                <input 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">SKU / Code</label>
                <input 
                  required 
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white"
                >
                  <option value="Bulk Feed">Bulk Feed</option>
                  <option value="Medical Vault">Medical Vault</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2">Re-order Level</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value, 10) || 0})}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
            </div>

            {/* Note about stock */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
              <p className="text-xs font-bold text-blue-800">
                Note: To adjust actual physical stock quantities, please use the <span className="font-black">Restock</span> or <span className="font-black">Adjust</span> actions. This form only modifies the item's master definition.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 px-6 rounded-lg font-black text-xs uppercase tracking-widest bg-ink text-white hover:bg-ink-strong transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={16} strokeWidth={3} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}