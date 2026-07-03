import React, { useState, useEffect } from 'react';

export default function FinanceForm({ onSubmit }) {
  const [type, setType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Milk Sale');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type,
      amount: parseFloat(amount) || 0,
      category,
    });
  };

  useEffect(() => {
    setCategory(type === 'Income' ? 'Milk Sale' : 'Feed Purchase');
  }, [type]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-ink/10 bg-[linear-gradient(135deg,rgba(235,248,255,0.94),rgba(255,255,255,0.98))] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Financial entry</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Record income or expense with the same layout and audit flow.</p>
          </div>
          <div className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            Quick add
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ink/10 bg-surface p-1 shadow-sm">
        <button 
          type="button" 
          onClick={() => setType('Income')}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
            type === 'Income' ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
          }`}
        >
          Income
        </button>
        <button 
          type="button" 
          onClick={() => setType('Expense')}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
            type === 'Expense' ? 'bg-danger text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
          }`}
        >
          Expense
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Amount (KSh)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input-machined w-full text-2xl font-black tabular-nums" placeholder="0.00" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-machined w-full font-semibold">
            {type === 'Income' ? (
              <><option>Milk Sale</option><option>Livestock Sale</option><option>Other Income</option></>
            ) : (
              <><option>Feed Purchase</option><option>Equipment Repair</option><option>Vet Services</option><option>Labor / Wages</option></>
            )}
          </select>
        </div>
      </div>

      <div className="flex justify-end border-t border-ink/10 pt-2">
        <button type="submit" className="btn-command inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-surface shadow-sm">
        Save transaction
        </button>
      </div>
    </form>
  );
}