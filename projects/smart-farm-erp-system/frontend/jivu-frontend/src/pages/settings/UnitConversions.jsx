import { useState } from 'react';
import { getAllConversions, saveAllConversions } from '../../lib/units';

export default function UnitConversions() {
  const [conversions, setConversions] = useState(() => getAllConversions());
  const [editing, setEditing] = useState({ context: '', unitName: '', baseUnit: 'kg', factor: '' });

  const handleAddOrUpdate = (ev) => {
    ev.preventDefault();
    const item = {
      id: `u-${Date.now()}`,
      context: editing.context.trim(),
      unitName: editing.unitName.trim(),
      baseUnit: editing.baseUnit,
      factor: parseFloat(editing.factor) || 1,
    };

    // Replace existing for same context
    const next = conversions.filter((c) => String(c.context).toLowerCase() !== String(item.context).toLowerCase());
    next.unshift(item);
    saveAllConversions(next);
    setConversions(next);
    setEditing({ context: '', unitName: '', baseUnit: 'kg', factor: '' });
  };

  const remove = (id) => {
    const next = conversions.filter((c) => c.id !== id);
    saveAllConversions(next);
    setConversions(next);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-reveal">
      <div className="border-b border-ink/10 pb-4">
        <h1 className="font-black text-3xl text-ink m-0">Unit Conversions</h1>
        <p className="text-sm text-ink-muted mt-2">Define local farm units (e.g. Kasuku) and their conversion to SI units.</p>
      </div>

      <div className="card-machined p-6 bg-surface/80">
        <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-ink-muted">Context</label>
            <input className="input-machined w-full" value={editing.context} onChange={(e) => setEditing((s) => ({ ...s, context: e.target.value }))} placeholder="e.g. Dairy Meal" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-muted">Local unit name</label>
            <input className="input-machined w-full" value={editing.unitName} onChange={(e) => setEditing((s) => ({ ...s, unitName: e.target.value }))} placeholder="e.g. Kasuku" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-muted">Base unit</label>
            <select className="input-machined w-full" value={editing.baseUnit} onChange={(e) => setEditing((s) => ({ ...s, baseUnit: e.target.value }))}>
              <option value="kg">Kilograms (kg)</option>
              <option value="l">Liters (L)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-muted">Conversion (1 local = ? base)</label>
            <input className="input-machined w-full" type="number" step="0.01" min="0" value={editing.factor} onChange={(e) => setEditing((s) => ({ ...s, factor: e.target.value }))} placeholder="e.g. 2.0" required />
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
            <button className="btn-command bg-brand text-surface" type="submit">Save Conversion</button>
            <div className="text-sm text-ink-muted">Saved conversions are stored locally for now. They are applied when showing quantities on barn-floor screens.</div>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="font-bold text-ink-strong mb-3">Existing conversions</h3>
          <div className="space-y-2">
            {conversions.length === 0 && <div className="text-sm text-ink-muted">No conversions yet. Add one above.</div>}
            {conversions.map((c) => (
              <div key={c.id} className="card-machined flex items-center justify-between p-3 bg-surface/70">
                <div>
                  <div className="font-bold text-ink-strong">{c.context}</div>
                  <div className="text-xs text-ink-muted">1 {c.unitName} = {c.factor} {c.baseUnit}</div>
                </div>
                <div>
                  <button onClick={() => remove(c.id)} className="text-sm text-danger">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
