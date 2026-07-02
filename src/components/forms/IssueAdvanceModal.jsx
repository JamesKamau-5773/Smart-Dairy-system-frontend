import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle } from 'lucide-react';

export default function IssueAdvanceModal({ isOpen, onClose, staff, onConfirm }) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (amount > 0 && staff) {
      onConfirm(staff, amount);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-ink text-sm uppercase tracking-widest">Issue Salary Advance</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors"><X size={16} /></button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-600">Issuing advance to:</p>
            <p className="font-bold text-lg text-slate-800">{staff?.name}</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Advance Amount (KSh)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                required 
                type="number" 
                placeholder="0.00" 
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-lg text-lg font-bold" 
              />
            </div>
          </div>

          <button onClick={handleConfirm} disabled={!amount} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-black text-xs uppercase shadow-sm hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
            <CheckCircle size={14} /> Confirm & Disburse
          </button>
        </div>
      </div>
    </div>
  );
}