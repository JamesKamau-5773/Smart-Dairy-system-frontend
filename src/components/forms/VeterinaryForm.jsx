import React from 'react';

export default function VeterinaryForm({ onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="rounded-2xl border border-ink/10 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-danger">Veterinary record</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">Document treatment details and withdrawal periods in a clear, audit-friendly layout.</p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Patient ID</label>
        <select className="input-machined w-full font-medium text-sm">
          <option>C-102 (Luna)</option>
          <option>K-201 (Calf Alpha)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Medicine / treatment</label>
          <input type="text" className="input-machined w-full text-sm" placeholder="e.g. Penicillin" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Withdrawal (days)</label>
          <input type="number" className="input-machined w-full font-medium text-sm" placeholder="0" />
        </div>
      </div>

      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 shadow-sm">
        <div className="text-xs font-semibold leading-6 text-danger">
          Entering a withdrawal period will automatically trigger a milk-to-market hardlock for this animal.
        </div>
      </div>

      <div className="flex justify-end border-t border-ink/10 pt-2">
        <button type="submit" className="btn-command inline-flex items-center justify-center rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-surface shadow-sm !shadow-[0_10px_24px_rgba(239,68,68,0.25)]">
          Initialize Medical Hardlock
        </button>
      </div>
    </form>
  );
}