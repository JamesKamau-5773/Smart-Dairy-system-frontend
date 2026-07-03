import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import Modal from '../ui/Modal';

export default function VerifyReturnModal({ isOpen, staff, onClose, onConfirm }) {
  const [returned, setReturned] = useState('YES');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReturned('YES');
      setNote('');
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) {
    return null;
  }

  const handleSubmit = () => {
    onConfirm({ returned: returned === 'YES', note: note.trim() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Verify Return - ${staff.name}`}>
      <div className="space-y-5">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Did {staff.name} return to work today?</p>
          <p className="mt-1 text-xs leading-6 text-gray-600">
            Use this gate to confirm whether the leave has ended. If the employee has not returned, the record remains overdue and the payroll penalty keeps accruing.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setReturned('YES')}
            className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${returned === 'YES' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <CheckCircle2 size={16} /> Yes, returned
          </button>
          <button
            type="button"
            onClick={() => setReturned('NO')}
            className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${returned === 'NO' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <AlertTriangle size={16} /> No, keep overdue
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            {returned === 'NO' ? 'Disciplinary note' : 'Verification note'}
          </span>
          <textarea
            rows="4"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={returned === 'NO' ? 'Optional note for the record' : 'Optional note for the return log'}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-slate-900"
          />
        </label>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
          >
            <X size={14} className="mr-1 inline" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors ${returned === 'YES' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
          >
            {returned === 'YES' ? 'Confirm return' : 'Keep overdue'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
