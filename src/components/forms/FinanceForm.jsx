import React from 'react';

export default function FinanceForm({ onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="flex gap-4 p-1 bg-surface-raised border border-ink/20 rounded-md">
        <button type="button" className="flex-1 py-2 bg-brand text-surface font-sans font-semibold text-xs rounded">Income</button>
        <button type="button" className="flex-1 py-2 font-sans font-semibold text-xs rounded">Expense</button>
      </div>

      <div className="space-y-2">
        <label className="font-sans text-[10px] font-semibold tracking-normal text-ink/50">Amount (KSh)</label>
        <input type="number" className="input-machined text-3xl font-black tabular-nums" placeholder="0.00" />
      </div>

      <div className="space-y-2">
        <label className="font-sans text-[10px] font-semibold tracking-normal text-ink/50">Category</label>
        <select className="input-machined font-sans font-semibold">
          <option>Milk Sale</option>
          <option>Feed Purchase</option>
          <option>Equipment Repair</option>
          <option>Mobile Service Parts</option>
        </select>
      </div>

      <button type="submit" className="btn-command w-full bg-accent text-brand py-4 text-lg">
        Save transaction
      </button>
    </form>
  );
}