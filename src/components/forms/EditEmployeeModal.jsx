import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Save } from 'lucide-react';

export default function EditEmployeeModal({ isOpen, onClose, onSave, staff }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    baseSalary: ''
  });

  useEffect(() => {
    if (staff && isOpen) {
      setFormData({
        name: staff.name,
        role: staff.role,
        baseSalary: staff.baseSalary
      });
    }
  }, [staff, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(staff.id, {
        ...formData,
        baseSalary: parseInt(formData.baseSalary, 10) || 0
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink-strong/30 p-3 backdrop-blur-sm touch-pan-y sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Edit employee profile" className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white touch-pan-y">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-ink text-sm uppercase tracking-widest flex items-center gap-2"><User size={16}/> Edit Employee Profile</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="employee-edit-name" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Full Name</label>
            <input id="employee-edit-name" required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mary Wanjiku" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
          </div>
          
          <div>
            <label htmlFor="employee-edit-role" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Job Role</label>
            <input id="employee-edit-role" required name="role" value={formData.role} onChange={handleChange} placeholder="e.g. Milking Assistant" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
          </div>

          <div>
            <label htmlFor="employee-edit-base-salary" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Base Salary (KES)</label>
            <input id="employee-edit-base-salary" required name="baseSalary" type="number" value={formData.baseSalary} onChange={handleChange} placeholder="e.g. 35000" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-black text-xs text-ink-muted uppercase">Cancel</button>
            <button type="submit" disabled={!formData.name || !formData.role || !formData.baseSalary} className="flex items-center px-4 py-2 bg-brand text-white rounded-lg font-black text-xs uppercase  hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed">
              <Save size={14} className="mr-2" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
