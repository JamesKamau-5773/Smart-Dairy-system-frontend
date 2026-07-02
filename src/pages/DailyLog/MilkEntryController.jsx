import React, { useState, useEffect } from 'react';
import YieldDiagnosticForm from '../../components/Diagnostics/YieldDiagnosticForm';
import BiologicalLimitAlert from '../../components/nutrition/BiologicalLimitAlert';

export default function MilkEntryController({ cow }) {
  const [actualMilk, setActualMilk] = useState('');
  const [expectedMilk, setExpectedMilk] = useState(25.0); 
  const [naturalLimit, setNaturalLimit] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    if (cow?.id) {
      setNaturalLimit(null);
    }
  }, [cow?.id]);

  const handleSaveMilkLog = () => {
    const milkLogged = parseFloat(actualMilk);
    if (isNaN(milkLogged)) return;

    if (milkLogged < (expectedMilk * 0.9)) {
      setShowChecklist(true);
    } else {
      console.log("Milk logged successfully. No drop detected.");
    }
  };

  const handleDiagnosticSubmit = async (diagnosticData) => {
    const payload = {
      cow_id: cow.id,
      expected_milk: expectedMilk,
      actual_milk: parseFloat(actualMilk),
      ...diagnosticData
    };
    
    // await fetch('/api/diagnostics/milk-drop', { method: 'POST', body: JSON.stringify(payload) });
    console.log("Diagnostic logged:", payload);
    setShowChecklist(false);
  };

  return (
    <div className="p-6 max-w-2xl bg-surface border border-ink/10 rounded-lg shadow-sm font-sans">
      <h2 className="text-xl font-bold text-ink mb-2">Morning Milking Log</h2>
      <p className="text-sm font-semibold text-ink/50 uppercase tracking-wide border-b border-ink/10 pb-4 mb-4">
        Cow Tag: {cow?.name || 'Unknown'}
      </p>
      
      <BiologicalLimitAlert 
        feedTarget={expectedMilk} 
        naturalLimit={naturalLimit} 
      />

      <div className="mt-6 flex gap-4 items-end bg-surface-raised p-4 border border-ink/10 rounded-md">
        <div className="flex-1">
          <label className="block text-xs font-bold text-ink/70 uppercase mb-2">
            Liters Milked Today
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              step="0.1"
              className="p-3 border border-ink/20 rounded-md w-32 text-lg font-mono font-bold text-ink bg-surface outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="0.0"
              value={actualMilk}
              onChange={(e) => setActualMilk(e.target.value)}
            />
            <span className="text-ink/50 font-bold uppercase text-sm">Liters</span>
          </div>
        </div>
        
        <button 
          onClick={handleSaveMilkLog}
          className="btn-command bg-brand text-surface px-8 py-3 rounded-md text-sm font-bold uppercase tracking-wide hover:bg-brand/90 transition-colors shadow-sm"
        >
          Save Log
        </button>
      </div>

      {showChecklist && (
        <YieldDiagnosticForm 
          cowName={cow?.name}
          expectedMilk={expectedMilk}
          actualMilk={parseFloat(actualMilk)}
          onClose={() => setShowChecklist(false)}
          onSubmit={handleDiagnosticSubmit}
        />
      )}
    </div>
  );
}