import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Minus, Plus, AlertCircle, RotateCcw, Loader2, Search, PlusCircle } from 'lucide-react';
import { logInventoryDelivery } from '../../services/InventoryOperations';

export default function StandardBatchLog({ onCancel, onSaveComplete }) {
  // 1. Quick-Select items
  const commonItems = [
    { id: 'dairy_meal', name: 'Dairy Meal', currentStock: 120, unit: 'kg' },
    { id: 'maize_germ', name: 'Maize Germ', currentStock: 850, unit: 'kg' },
    { id: 'silage', name: 'Silage', currentStock: 4500, unit: 'kg' },
  ];

  // 2. Base inventory
  const baseInventory = [
    ...commonItems,
    { id: 'wheat_bran', name: 'Wheat Bran', currentStock: 300, unit: 'kg' },
    { id: 'dry_cow_feed', name: 'Dry Cow Feed', currentStock: 150, unit: 'kg' },
    { id: 'salt_lick', name: 'Mineral Salt Lick', currentStock: 50, unit: 'kg' },
  ];

  const [selectedItem, setSelectedItem] = useState(commonItems[0]);
  const [quantity, setQuantity] = useState(0);
  
  // Smart Search & Custom Item State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customItems, setCustomItems] = useState([]); // Holds items created on the fly
  const searchRef = useRef(null);

  // Undo buffer state
  const [isStaged, setIsStaged] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Combine base inventory with any custom items added during this session
  const fullInventory = [...baseInventory, ...customItems];
  
  // Filter inventory based on what the user types
  const filteredInventory = fullInventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync search input when a quick-select card is clicked
  useEffect(() => {
    if (selectedItem && !isSearchOpen) {
      setSearchTerm(selectedItem.name);
    }
  }, [selectedItem, isSearchOpen]);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        // Reset search term to selected item if they click away without choosing
        if (selectedItem) setSearchTerm(selectedItem.name);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

  const incrementQuantity = (amount) => setQuantity(prev => prev + amount);
  const decrementQuantity = (amount) => setQuantity(prev => Math.max(0, prev - amount));

  // Timer Logic
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
    setCountdown(5);
  };

  const executeDatabaseLog = async () => {
    const result = await logInventoryDelivery({
      itemId: selectedItem.id,
      itemName: selectedItem.name, // Pass name in case it's a custom item
      quantity: quantity
    });

    if (result.success) {
      onSaveComplete(); 
    } else {
      alert("Database error. Please check your connection and try again.");
      handleUndo();
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setIsSearchOpen(false);
  };

  const handleAddNewItem = () => {
    const newItem = {
      id: `custom_${Date.now()}`,
      name: searchTerm,
      currentStock: 0,
      unit: 'kg' // Defaulting to kg for new raw items
    };
    setCustomItems([...customItems, newItem]);
    handleSelectItem(newItem);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      <div className={`transition-opacity duration-300 ${isStaged ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        
        {/* STEP 1: What arrived? */}
        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase tracking-normal text-ink-muted mb-3">
            1. What arrived?
          </label>
          
          {/* Quick-Select Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {commonItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
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

          {/* Smart Searchable Combobox */}
          <div className="relative" ref={searchRef}>
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className={isSearchOpen ? "text-brand" : "text-ink-muted"} />
             </div>
             
             <input 
                type="text"
                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-input text-sm font-bold text-ink-strong focus:outline-none focus:ring-1 focus:ring-brand shadow-sm transition-colors ${isSearchOpen ? 'border-brand' : 'border-ink/10'}`}
                placeholder="Search inventory or type a new item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  if (searchTerm === selectedItem?.name) setSearchTerm(''); // Clear text to show full list on focus
                }}
             />

             {/* Dropdown Results */}
             {isSearchOpen && (
               <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink/10 rounded-input shadow-xl z-20 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-brand/5 border-b border-ink/5 last:border-0 flex justify-between items-center transition-colors"
                      >
                        <span className="text-sm font-bold text-ink-strong">{item.name}</span>
                        <span className="text-xs font-medium text-ink-muted text-right">
                          Stock: {item.currentStock} {item.unit}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2">
                      <button 
                        onClick={handleAddNewItem}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-brand/5 hover:bg-brand/10 text-brand rounded-md text-sm font-bold transition-colors border border-brand/20 border-dashed"
                      >
                        <PlusCircle size={16} /> Add "{searchTerm}" as new item
                      </button>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>

        {/* STEP 2: How much was delivered? */}
        <div className="mb-8 bg-surface-raised p-6 rounded-card border border-ink/5">
          <label className="block text-[10px] font-black uppercase tracking-normal text-ink-muted mb-4 text-center">
            2. How much was delivered?
          </label>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-6 mb-6">
              <button onClick={() => decrementQuantity(50)} className="w-12 h-12 rounded-full bg-white border border-ink/10 flex items-center justify-center text-ink-muted hover:text-danger hover:border-danger hover:bg-danger/5 shadow-sm transition-colors">
                <Minus size={24} />
              </button>
              
              <div className="text-center min-w-[120px]">
                <span className="text-5xl font-black text-ink-strong">{quantity}</span>
                <span className="text-sm font-bold text-ink-muted ml-1">{selectedItem?.unit || 'kg'}</span>
              </div>
              
              <button onClick={() => incrementQuantity(50)} className="w-12 h-12 rounded-full bg-white border border-ink/10 flex items-center justify-center text-ink-muted hover:text-brand hover:border-brand hover:bg-brand/5 shadow-sm transition-colors">
                <Plus size={24} />
              </button>
            </div>
            
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

        {quantity > 5000 && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-warning/10 border border-warning/20 rounded-input text-warning-dark text-xs font-bold">
            <AlertCircle size={16} className="shrink-0" />
            Large delivery warning ({quantity} kg). Double-check before confirming.
          </div>
        )}
        
        {/* Action Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-ink/5">
          <button onClick={onCancel} className="text-sm font-black text-ink-muted hover:text-ink-strong transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleInitialConfirm}
            disabled={quantity === 0 || !selectedItem}
            className="bg-brand hover:bg-brand-dark disabled:bg-ink-muted disabled:opacity-50 text-white px-8 py-3 rounded-button font-black text-sm shadow-sm flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 size={18} /> Confirm Delivery
          </button>
        </div>
      </div>

      {/* The Undo Buffer Overlay */}
      {isStaged && (
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <div className="bg-ink-strong text-white p-4 rounded-card shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-brand" />
              <div>
                <p className="font-black text-sm">Saving {quantity}{selectedItem?.unit} of {selectedItem?.name}</p>
                <p className="text-xs font-medium text-white/60">Committing to database in {countdown}s...</p>
              </div>
            </div>
            <button onClick={handleUndo} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-button font-black text-xs flex items-center gap-2 transition-colors">
              <RotateCcw size={14} /> UNDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}