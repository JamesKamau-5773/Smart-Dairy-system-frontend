import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Search, Minus, Plus, CheckCircle2, PackageCheck } from 'lucide-react';

export default function StandardDeliveryModal({ isOpen, onClose, item, onRestock }) {
  const [amount, setAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Update selected product when the modal opens with a specific item
  useEffect(() => {
    if (item?.name) {
      setSelectedProduct(item.name);
      setSearchQuery(item.name);
    } else {
      setSelectedProduct('');
      setSearchQuery('');
    }
    setAmount(0); // Reset amount on open
  }, [item, isOpen]);

  if (!isOpen) return null;

  // Mock data for the quick-select cards (only used if no specific item was passed)
  const quickSelectOptions = [
    { name: 'Dairy Meal', stock: '120 KG' },
    { name: 'Maize Germ', stock: '850 KG' },
    { name: 'Silage', stock: '4500 KG' },
  ];

  const handleConfirm = () => {
    // If an onRestock callback is provided and we have a valid item and amount, call it.
    if (onRestock && item && amount > 0) {
      onRestock(item, amount);
    } else {
      console.log(`Logging standard batch: ${amount}kg of ${selectedProduct}`);
    }
    onClose();
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
                    <span className="font-black text-brand text-lg">{item.name}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-6">
                    SKU: {item.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</div>
                  <div className="font-black text-slate-700">{item.stock.value} {item.stock.unit}</div>
                </div>
              </div>
            ) : (
              /* GENERAL RESTOCK VIEW (User clicked "Add to Feedstore" at the top) */
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {quickSelectOptions.map((opt) => {
                    const isSelected = selectedProduct.includes(opt.name);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(opt.name);
                          setSearchQuery(opt.name);
                        }}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-brand bg-brand/5' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`font-black text-sm mb-2 ${isSelected ? 'text-brand' : 'text-slate-800'}`}>
                          {opt.name}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Stock: {opt.stock}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedProduct(e.target.value);
                    }}
                    placeholder="Search resources..." 
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand/50 transition-all shadow-sm"
                  />
                </div>
              </>
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
                <span className="text-xl font-bold text-slate-400">{item?.stock?.unit || 'units'}</span>
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
            disabled={amount === 0 || !selectedProduct}
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