import React from 'react';

export default function ProductionForm({ onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="rounded-2xl border border-ink/10 bg-[linear-gradient(135deg,rgba(235,248,255,0.94),rgba(255,255,255,0.98))] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Milk production entry</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">Capture the cow, session, and volume in a layout that matches the rest of the operations suite.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Select cow</label>
          <select className="input-machined w-full font-semibold text-sm">
            <option>C-101 (Bessie)</option>
            <option>C-102 (Luna)</option>
            <option>C-103 (Daisy)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Session</label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ink/10 bg-surface p-1 shadow-sm">
            {['Morning', 'Evening'].map((session) => (
              <button key={session} type="button" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink">
                {session}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Volume (liters)</label>
        <div className="relative">
          <input type="number" step="0.01" className="input-machined w-full text-2xl font-black tabular-nums" placeholder="00.00" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-ink/30">L</span>
        </div>
      </div>

      <div className="flex justify-end border-t border-ink/10 pt-2">
        <button type="submit" className="btn-command inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-surface shadow-sm">
          Submit production record
        </button>
      </div>
    </form>
  );
}