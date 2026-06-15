import React from 'react';

export default function VeterinaryForm({ onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="space-y-2">
        <label className="font-sans text-xs sm:text-[11px] font-medium text-ink-muted">Patient ID</label>
        <select className="input-machined font-sans font-medium text-sm">
          <option>C-102 (Luna)</option>
          <option>K-201 (Calf Alpha)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <label className="font-sans text-xs sm:text-[11px] font-medium text-ink-muted">Medicine/treatment</label>
          <input type="text" className="input-machined text-sm" placeholder="e.g. Penicillin" />
        </div>
        <div className="space-y-2">
          <label className="font-sans text-xs sm:text-[11px] font-medium text-ink-muted">Withdrawal (days)</label>
          <input type="number" className="input-machined font-sans font-medium text-sm" placeholder="0" />
        </div>
      </div>

      <div className="p-4 bg-danger/5 border-2 border-danger/20 flex gap-4 items-start">
        <div className="font-sans text-xs sm:text-[11px] text-danger font-medium leading-tight">
          System Alert: Entering a withdrawal period will automatically trigger a milk-to-market hardlock for this animal.
        </div>
      </div>

      <button type="submit" className="btn-command w-full min-h-[44px] bg-danger text-surface py-4 text-sm sm:text-lg font-semibold !shadow-[0_10px_24px_rgba(239,68,68,0.25)] rounded-md">
        Initialize Medical Hardlock
      </button>
    </form>
  );
}