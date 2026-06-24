import React, { useState } from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';

const FARM_CHECKLIST = [
  { id: 'water', label: 'Was the water trough empty, dirty, or too far away?' },
  { id: 'feed', label: 'Did the cow leave her dairy meal or sort through the feed?' },
  { id: 'weather', label: 'Was there heavy rain, deep mud, or extreme heat today?' },
  { id: 'health', label: 'Any signs of mastitis, limping, or sickness?' },
  { id: 'routine', label: 'Was milking delayed or done by a new/rough milker today?' }
];

export default function YieldDiagnosticForm({ cowName, expectedMilk = 0, actualMilk = 0, onClose, onSubmit }) {
  const missingMilk = (expectedMilk - actualMilk).toFixed(1);
  const [checklist, setChecklist] = useState({});
  const [notes, setNotes] = useState("");

  const handleToggle = (id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ checklist, notes, missingMilk });
  };

  return (
    <div className="fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-lg shadow-xl border-t-4 border-brand rounded-lg overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink/10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <AlertTriangle size={18} strokeWidth={2.5} />
              <h2 className="text-sm font-bold uppercase tracking-wider">Milk Drop Alert</h2>
            </div>
            <h3 className="text-xl font-semibold text-ink">{cowName || "Unknown Cow"}</h3>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* The Math Summary */}
        <div className="bg-surface-raised px-6 py-4 flex justify-between border-b border-ink/10">
          <div>
            <p className="text-xs font-semibold text-ink/50 uppercase">Expected</p>
            <p className="text-lg font-mono font-bold text-ink">{expectedMilk} L</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/50 uppercase">Actual</p>
            <p className="text-lg font-mono font-bold text-ink">{actualMilk} L</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-danger uppercase">Missing Milk</p>
            <p className="text-lg font-mono font-bold text-danger">-{missingMilk} L</p>
          </div>
        </div>

        {/* The Diagnostic Checklist */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-ink/70 mb-4 font-medium">
            We fed this cow to produce more than she gave. Run through this quick check to find out where the milk went:
          </p>

          <div className="space-y-3 mb-4">
            {FARM_CHECKLIST.map(q => (
              <label key={q.id} className="flex items-start gap-3 p-3 border border-ink/10 rounded-md hover:bg-surface-raised cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-brand border-ink/20 rounded focus:ring-brand"
                  checked={!!checklist[q.id]}
                  onChange={() => handleToggle(q.id)}
                />
                <span className="text-sm text-ink font-medium">{q.label}</span>
              </label>
            ))}
          </div>

          <textarea 
            className="w-full p-3 border border-ink/10 rounded-md text-sm text-ink bg-surface outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            placeholder="Any extra notes (e.g., 'Cow was chased by a dog' or 'Spilled some milk')..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="mt-6 flex justify-end">
            <button type="submit" className="btn-command flex items-center gap-2 bg-brand text-surface px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-brand/90 transition-colors shadow-sm">
              <Save size={16} /> Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}