import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Search, Minus, Plus, CheckCircle2, PackageCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../lib/backendApi';

export default function StandardDeliveryModal({ isOpen, onClose, item, onRestock, tenantId, farmId }) {
  const [amount, setAmount] = useState(0);
  const [stagedItem, setStagedItem] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Update selected product when the modal opens with a specific item
  useEffect(() => {
    setStagedItem(item || null);
    setAmount(0); // Reset amount on open
    setSubmitError('');
  }, [item, isOpen]);

  // Fetch critical items directly from the new backend endpoint
  const { data: quickSelectOptions = [], isLoading } = useQuery({
    queryKey: ['quick-restock-items', tenantId, farmId],
    queryFn: () => inventoryApi.getQuickRestockItems(),
    // Only fetch when the modal is open and we are in the general restock mode (no specific item passed)
    enabled: isOpen && !item,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!isOpen) return null;

  // `stagedItem` is synchronized in an effect, so render directly from the
  // caller's item during the first open render.
  const selectedItem = item ?? stagedItem;
  const selectedStock = selectedItem?.stock ?? {};

  const handleQuickSelect = (option) => {
    setStagedItem(option);
  };

  const handleConfirm = async () => {
    if (!onRestock || !selectedItem || amount <= 0) {
      return;
    }

    try {
      await onRestock(selectedItem, amount);
      onClose();
    } catch (error) {
      setSubmitError(
        error?.response?.data?.error
        ?? error?.response?.data?.message
        ?? 'Could not record this delivery.'
      );
    }
  };

  const increaseAmount = (val) => setAmount((prev) => prev + val);
  const decreaseAmount = () => setAmount((prev) => Math.max(0, prev - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-reveal">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-brand" /> 
            {item ? 'Restock Resource' : 'Log Standard Batch'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          {/* SECTION 1: WHAT ARRIVED */}
          <div className="mb-8">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
              1. What Arrived?
            </label>
            
            {item ? (
              /* TARGETED RESTOCK VIEW (User clicked a specific row) */
              <div className="p-5 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PackageCheck size={16} className="text-brand" />
                    <span className="font-black text-brand text-lg">{selectedItem?.name ?? 'Selected resource'}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-6">
                    SKU: {selectedItem?.sku ?? 'Not assigned'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</div>
                  <div className="font-black text-slate-700">
                    {selectedStock.value ?? 0} {selectedStock.unit ?? selectedItem?.unit ?? 'units'}
                  </div>
                </div>
              </div>
            ) : (
              /* GENERAL RESTOCK VIEW (User clicked "Add to Feedstore" at the top) */
              <div className="quick-select-container mb-6">
                <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2 block">
                  Priority Restock
                </label>
                
                {isLoading ? (
                  <div className="text-sm text-slate-400">Loading priorities...</div>
                ) : quickSelectOptions.length === 0 ? (
                  <div className="text-sm text-slate-400">All stock levels are healthy!</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {quickSelectOptions.map((option) => {
                      const isSelected = stagedItem?.id === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleQuickSelect(option)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 border ${
                            isSelected
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100'
                          }`}
                        >
                          {option.name} 
                          <span className="opacity-75">
                            ({option.currentStock}{option.unit})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: HOW MUCH WAS DELIVERED */}
          <div className="border border-slate-100 rounded-2xl p-8 flex flex-col items-center bg-slate-50/50">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
              2. How Much Was Delivered?
            </label>
            
            <div className="flex items-center justify-center gap-8 mb-8">
              <button 
                type="button"
                onClick={decreaseAmount}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
              >
                <Minus size={20} />
              </button>
              
              <div className="flex items-baseline gap-2 min-w-[100px] justify-center">
                <span className="text-6xl font-black text-slate-800 tabular-nums tracking-tighter">
                  {amount}
                </span>
                <span className="text-xl font-bold text-slate-400">{selectedStock.unit ?? selectedItem?.unit ?? 'units'}</span>
              </div>

              <button 
                type="button"
                onClick={() => increaseAmount(1)}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => increaseAmount(50)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                + 50kg Bag
              </button>
              <button 
                type="button"
                onClick={() => increaseAmount(70)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                + 70kg Bag
              </button>
            </div>
            {submitError && <p className="mt-4 text-xs font-semibold text-danger">{submitError}</p>}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between p-6 bg-white border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose}
            className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={amount === 0 || !selectedItem}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all shadow-sm bg-brand text-white hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={16} />
            Confirm Delivery
          </button>
        </div>

      </div>
    </div>
  );
}
