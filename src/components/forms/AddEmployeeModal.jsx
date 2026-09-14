import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, BriefcaseBusiness, WalletCards } from 'lucide-react';

const INITIAL_STATE = {
  name: '',
  role: '',
  baseSalary: '',
  hireDate: new Date().toISOString().slice(0, 10),
};

export default function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_STATE);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave({
          ...formData,
          baseSalary: parseInt(formData.baseSalary, 10) || 0
      });
      onClose();
    } catch {
      // The parent displays the request error; keep the form open for correction.
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white shadow-sm"><UserPlus size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">People & payroll</p>
              <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Add employee</h3>
              <p className="mt-1 text-xs text-slate-500">Create a staff profile for this farm.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close add employee dialog" className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><UserPlus size={13} /> Full name</span>
              <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mary Wanjiku" className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness size={13} /> Job role</span>
              <input required name="role" value={formData.role} onChange={handleChange} placeholder="e.g. Milking assistant" className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><WalletCards size={13} /> Base salary (KSh)</span>
              <input required min="0" name="baseSalary" type="number" value={formData.baseSalary} onChange={handleChange} placeholder="e.g. 35,000" className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium tabular-nums text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Hire date</span>
              <input required name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600">
            Salary and profile details can be updated later from the employee drawer.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving || !formData.name || !formData.role || !formData.baseSalary} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300">
              <Save size={14} /> {isSaving ? 'Saving employee...' : 'Save employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}