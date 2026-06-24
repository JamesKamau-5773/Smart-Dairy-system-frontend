// src/components/inventory/StandardDeliveryModal.jsx
import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Minus, Plus, Check } from 'lucide-react';

export default function StandardDeliveryModal({ isOpen, onClose, item }) {
  const [amount, setAmount] = useState(0);

  // Reset amount whenever the modal opens with a new item
  useEffect(() => {
    if (isOpen) setAmount(0);
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleIncrement = () => setAmount(prev => prev + 1);
  const handleDecrement = () => setAmount(prev => Math.max(0, prev - 1));
  const handleQuickAdd = (val) => setAmount(prev => prev + val);

  const handleConfirm = () => {
    console.log(`Confirmed delivery of ${amount} ${item.unit} for ${item.name}`);
    // Future: Trigger API call here
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 p-2 rounded-[8px] text-brand">
              <PackagePlus size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-ink text-lg tracking-tight">Log Delivery</h3>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mt-0.5">Standard Receipt</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-muted hover:text-danger p-2 rounded-full hover:bg-danger/10 transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          
          {/* Target Item Context */}
          <div>
            <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2 block">
              1. Receiving Destination
            </label>
            <div className="border border-brand/20 bg-brand/5 rounded-[12px] p-4 flex justify-between items-center">
              <div>
                <p className="font-black text-ink-strong text-sm">{item.name}</p>
                <p className="text-xs font-bold text-ink-muted mt-0.5">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Current Stock</p>
                <p className="font-black text-ink tabular-nums">{item.stock} {item.unit}</p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-3 block text-center">
              2. How much arrived?
            </label>
            
            <div className="flex items-center justify-center gap-6 mb-6">
              <button 
                onClick={handleDecrement}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-ink-muted hover:border-brand hover:text-brand transition-colors"
              >
                <Minus size={20} strokeWidth={3} />
              </button>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-4xl font-black text-ink tabular-nums tracking-tighter">
                  {amount}
                </span>
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                  {item.unit}
                </span>
              </div>

              <button 
                onClick={handleIncrement}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-ink-muted hover:border-brand hover:text-brand transition-colors"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Quick Add Chips (Dynamic based on item type) */}
            <div className="flex justify-center gap-3">
              {item.type === 'bulk' ? (
                <>
                  <button onClick={() => handleQuickAdd(50)} className="px-4 py-2 rounded-[8px] border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-sm">+ 50 {item.unit}</button>
                  <button onClick={() => handleQuickAdd(70)} className="px-4 py-2 rounded-[8px] border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-sm">+ 70 {item.unit}</button>
                </>
              ) : (
                <>
                  <button onClick={() => handleQuickAdd(5)} className="px-4 py-2 rounded-[8px] border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-sm">+ 5 {item.unit}</button>
                  <button onClick={() => handleQuickAdd(10)} className="px-4 py-2 rounded-[8px] border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors shadow-sm">+ 10 {item.unit}</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[#F8FAFC] border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-[12px] font-black text-xs uppercase tracking-wider text-ink-muted hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={amount <= 0}
            className="flex-2 py-3.5 px-6 rounded-[12px] font-black text-xs uppercase tracking-wider bg-brand text-white hover:bg-[#1546b3] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} strokeWidth={3} /> Confirm Delivery
          </button>
        </div>

      </div>
    </div>
  );
}