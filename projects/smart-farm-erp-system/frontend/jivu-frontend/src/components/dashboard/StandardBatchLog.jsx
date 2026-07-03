// src/components/dashboard/StandardBatchLog.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Minus, Plus, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { logInventoryDelivery } from '../../services/InventoryOperations';

export default function StandardBatchLog({ onCancel, onSaveComplete }) {
  // Pre-loaded inventory shortcuts
  const commonItems = [
    { id: 'lactation_mix', name: 'High-Yield Lactation Mix', currentStock: 120, unit: 'kg' },
    { id: 'maize_germ', name: 'Maize Germ', currentStock: 850, unit: 'kg' },
    { id: 'silage', name: 'Boma Rhodes Silage', currentStock: 4500, unit: 'kg' },
  ];

  const [selectedItem, setSelectedItem] = useState(commonItems[0]);
  const [quantity, setQuantity] = useState(0);
  
  // Staging state for the 5-second Undo buffer
  const [isStaged, setIsStaged] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const incrementQuantity = (amount) => setQuantity(prev => prev + amount);
  const decrementQuantity = (amount) => setQuantity(prev => Math.max(0, prev - amount));

  // The Undo Buffer Logic (Jacob's Law - Delayed Execution)
  useEffect(() => {
    let timer;
    if (isStaged && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (isStaged && countdown === 0) {
      executeDatabaseLog();
    }
    return () => clearTimeout(timer);
  }, [isStaged, countdown]);

  const handleInitialConfirm = () => {
    setIsStaged(true);
    setCountdown(5);
  };

  const handleUndo = () => {
    setIsStaged(false);
    setCountdown(5); // Reset the timer
  };

  const executeDatabaseLog = async () => {
    const result = await logInventoryDelivery({
      itemId: selectedItem.id,
      quantity: quantity
    });

    if (result.success) {
      onSaveComplete(); 
    } else {
      alert("Database error. Please check your connection and try again.");
      handleUndo();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      
      {/* Dim the form if it is currently staged for saving */}
      <div className={`transition-opacity duration-300 ${isStaged ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        
        {/* STEP 1: Quick-Select Grid */}
        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase tracking-normal text-ink-muted mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
            1. What arrived?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {commonItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`text-left p-4 rounded-card border-2 transition-all ${
                  selectedItem.id === item.id 
                    ? 'border-brand bg-brand/5 shadow-sm' 
                    : 'border-ink/5 bg-surface-raised hover:border-brand/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-black text-sm ${selectedItem.id === item.id ? 'text-brand-dark' : 'text-ink-strong'}`}>
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">
                  Stock: {item.currentStock} {item.unit}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: The "Tap" Entry System */}
        <div className="mb-8 bg-surface-raised p-6 rounded-card border border-ink/5">
          <label className="block text-[10px] font-black uppercase tracking-normal text-ink-muted mb-4 text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
            2. How much was delivered?
          </label>
          <div className="flex flex-col items-center">
            
            {/* Core Increment/Decrement UI */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button 
                onClick={() => decrementQuantity(50)} 
                className="w-12 h-12 rounded-full bg-white border border-ink/10 flex items-center justify-center text-ink-muted hover:text-danger hover:border-danger hover:bg-danger/5 transition-colors shadow-sm"
              >
                <Minus size={24} />
              </button>
              
              <div className="text-center min-w-[120px]">
                <span className="text-5xl font-black tracking-normal text-ink-strong drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                  {quantity}
                </span>
                <span className="text-sm font-bold text-ink-muted ml-1">{selectedItem.unit}</span>
              </div>
              
              <button 
                onClick={() => incrementQuantity(50)} 
                className="w-12 h-12 rounded-full bg-white border border-ink/10 flex items-center justify-center text-ink-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-colors shadow-sm"
              >
                <Plus size={24} />
              </button>
            </div>
            
            {/* Standard Farm Packaging Shortcuts */}
            <div className="flex gap-3">
              <button onClick={() => incrementQuantity(50)} className="px-4 py-2 bg-white border border-ink/10 rounded-button text-sm font-black text-ink-strong hover:border-brand/30 shadow-sm transition-colors">
                + 50kg Bag
              </button>
              <button onClick={() => incrementQuantity(70)} className="px-4 py-2 bg-white border border-ink/10 rounded-button text-sm font-black text-ink-strong hover:border-brand/30 shadow-sm transition-colors">
                + 70kg Bag
              </button>
            </div>
          </div>
        </div>

        {/* Validation Warning */}
        {quantity > 5000 && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-warning/10 border border-warning/20 rounded-input text-warning-dark text-xs font-bold">
            <AlertCircle size={16} className="shrink-0" />
            Large delivery warning ({quantity} kg). Double-check before confirming.
          </div>
        )}
        
        {/* Action Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-ink/5">
          <button 
            onClick={onCancel} 
            className="text-sm font-black text-ink-muted hover:text-ink-strong transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleInitialConfirm}
            disabled={quantity === 0}
            className="bg-brand hover:bg-brand-dark disabled:bg-ink-muted disabled:opacity-50 text-white px-8 py-3 rounded-button font-black tracking-normal text-sm shadow-sm flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 size={18} /> Confirm Delivery
          </button>
        </div>
      </div>

      {/* THE UNDO TOAST: Overlays the form when staged */}
      {isStaged && (
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <div className="bg-ink-strong text-white p-4 rounded-card shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-brand" />
              <div>
                <p className="font-black text-sm tracking-normal">Saving {quantity}kg of {selectedItem.name}</p>
                <p className="text-xs font-medium text-white/60">Committing to database in {countdown}s...</p>
              </div>
            </div>
            <button 
              onClick={handleUndo}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-button font-black text-xs flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={14} /> UNDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}