import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../hooks/useTenant';
import { financeApi } from '../../lib/backendApi';
import { Loader2, ArrowRight } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
];

export default function AddBuyerForm({ onSuccess, onCancel }) {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+254',
    contact: '',
    type: 'Individual',
    rate_per_liter: '',
    initial_balance: '0'
  });

  const mutation = useMutation({
    mutationFn: async (newBuyer) => {
      return financeApi.createBuyer({
        ...newBuyer,
        tenant_id: tenantId,
        farm_id: farmId,
      });
    },
    onSuccess: (newlyCreatedBuyer) => {
      // Optimistically inject the new buyer into the list cache
      queryClient.setQueryData(['finance-buyers', tenantId, farmId], (oldData) => {
        const currentList = Array.isArray(oldData) ? oldData : [];
        return [...currentList, newlyCreatedBuyer];
      });
      
      if (onSuccess) onSuccess(); 
    },
    onError: (error) => {
      console.error("Failed to add buyer:", error);
      // A user-facing notification could be added here.
    },
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    // Clean phone number: remove non-numeric chars except leading +, remove leading zeros
    const cleanNumber = formData.contact.replace(/[\s-]/g, '').replace(/^0+/, '');
    const formattedPhone = `${formData.countryCode}${cleanNumber}`;

    mutation.mutate({
      name: formData.name,
      contact: formattedPhone,
      type: formData.type,
      rate_per_liter: parseFloat(formData.rate_per_liter),
      balance: parseFloat(formData.initial_balance)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Explicit validation: Ensure required fields have content and rate is a valid number
  const isFormValid = 
    formData.name.trim().length > 0 && 
    formData.contact.trim().length > 0 && 
    formData.rate_per_liter !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-reveal">
      
      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Buyer Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., John Kamau"
          className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">WhatsApp Number</label>
        <div className="flex">
          <select
            name="countryCode"
            value={formData.countryCode}
            onChange={handleChange}
            className="w-[100px] bg-surface-raised border border-ink/20 border-r-0 text-ink font-bold rounded-l-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:z-10 transition-all cursor-pointer appearance-none text-center"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <input
            type="tel"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="700 000 000"
            className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-r-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:z-10 transition-all"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Buyer Category</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all cursor-pointer appearance-none"
        >
          <option value="Individual">Individual (Local Buyer)</option>
          <option value="Cooperative">Cooperative / Dairy Board</option>
          <option value="Commercial">Hotel / Restaurant / Commercial</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Agreed Rate (KSh/L)</label>
          <input
            type="number"
            name="rate_per_liter"
            value={formData.rate_per_liter}
            onChange={handleChange}
            placeholder="e.g., 50"
            className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Starting Balance</label>
          <input
            type="number"
            name="initial_balance"
            value={formData.initial_balance}
            onChange={handleChange}
            className="w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-ink/10 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl font-bold text-ink-muted hover:text-ink hover:bg-ink/5 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid || mutation.isPending}
          className="flex-[2] btn-command bg-brand text-white hover:bg-brand/90 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <>Save Buyer <ArrowRight size={18} /></>}
        </button>
      </div>
    </form>
  );
}