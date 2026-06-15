import React from 'react';

export default function ProductionForm({ onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <label className="font-sans text-xs sm:text-[10px] font-semibold tracking-normal text-ink/50">Select cow</label>
          <select className="input-machined font-sans font-semibold text-sm">
            <option>C-101 (Bessie)</option>
            <option>C-102 (Luna)</option>
            <option>C-103 (Daisy)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="font-sans text-xs sm:text-[10px] font-semibold tracking-normal text-ink/50">Session</label>
          <div className="flex gap-2">
            {['Morning', 'Evening'].map(session => (
              <button key={session} type="button" className="flex-1 min-h-[44px] py-2 border border-ink/20 font-sans text-xs font-semibold hover:bg-accent/25 transition-colors rounded-md">
                {session}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-sans text-xs sm:text-[10px] font-semibold tracking-normal text-ink/50">Volume (liters)</label>
        <div className="relative">
          <input type="number" step="0.01" className="input-machined text-2xl sm:text-4xl font-black tabular-nums" placeholder="00.00" />
          <span className="absolute right-4 bottom-4 font-sans font-semibold text-ink/30">L</span>
        </div>
      </div>

      <button type="submit" className="btn-command w-full min-h-[44px] bg-brand text-accent py-4 text-sm sm:text-lg font-semibold rounded-md">
        Submit production record
      </button>
    </form>
  );
}