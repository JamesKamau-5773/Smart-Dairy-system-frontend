// src/components/forms/IncomeModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Briefcase, CreditCard } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';

const INITIAL_STATE = { 
  date: '', 
  amount: '', 
  source: '', 
  stream: 'Milk Sales', 
  paymentMethod: 'M-Pesa', 
  reference: '', 
  notes: '' 
};

export default function IncomeModal({ isOpen, onClose, onSave }) {
  const { data: customers } = useCustomers();
  const [formData, setFormData] = useState(INITIAL_STATE);

  // Reset form state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_STATE);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-ink text-sm uppercase tracking-widest">Log New Income</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Date and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Date Received</label>
              <input required name="date" value={formData.date} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Amount Received (KSh)</label>
              <input required name="amount" value={formData.amount} onChange={handleChange} type="number" placeholder="0.00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
          </div>

          {/* Customer Dropdown */}
          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Who paid you? (Customer/Co-op)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                required
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold outline-none bg-white"
              >
                <option value="">Select a customer...</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Income Type and Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">What is this for?</label>
              <select name="stream"
                value={formData.stream}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold outline-none bg-white"
              >
                <option value="Milk Sales">Milk Sales</option>
                <option value="Livestock Sales">Livestock Sales</option>
                <option value="Other">Other Income</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Payment Method</label>
              <select name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold outline-none bg-white"
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Transaction Reference */}
          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Transaction Reference (Code)</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input name="reference" value={formData.reference} onChange={handleChange} placeholder="e.g. QJ12ABC345" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Additional Details</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold h-20" />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-black text-xs text-ink-muted uppercase">Cancel</button>
            <button type="submit" 
              disabled={!formData.date || !formData.amount || !formData.source}
              className="flex items-center px-4 py-2 bg-brand text-white rounded-lg font-black text-xs uppercase shadow-sm hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed">
              <Save size={14} className="mr-2" /> Log Income
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}