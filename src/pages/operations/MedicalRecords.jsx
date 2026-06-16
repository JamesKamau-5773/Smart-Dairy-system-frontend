import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import LABELS from '../../lib/labels';
import Modal from '../../components/ui/Modal';

export default function VetRecords() {
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Mock Data - This will eventually come from an API
  const encounters = [
    { 
      id: 'enc_001',
      date: "2026-05-20", 
      cow: "C-101 (Luna)", 
      reason: "Swollen udder", 
      diagnosis: "Mild Mastitis", 
      meds: "Antibiotics (3 days)",
      recommendations: "Hand-milk for 48hrs"
    },
    { 
      id: 'enc_002',
      date: "2026-05-18", 
      cow: "C-84 (Bessie)", 
      reason: "Routine Checkup", 
      diagnosis: "Healthy", 
      meds: "None",
      recommendations: "Monitor diet"
    }
  ];

  return (
    <div className="animate-reveal space-y-8">
      <div className="flex justify-between items-end border-b border-ink/10 pb-6">
        <div>
          <h2 className="font-sans font-bold text-3xl text-brand">{LABELS.MEDICAL_RECORDS}</h2>
          <p className="text-ink-muted text-sm mt-2">Keep track of vet visits, sicknesses, and medicines given.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-command flex items-center gap-2">
          <Plus size={16} /> {showForm ? LABELS.CANCEL : LABELS.LOG_NEW_VISIT}
        </button>
      </div>

      {/* NEW VISIT FORM (Only visible when toggled) */}
      {showForm && (
        <div className="card-machined bg-surface/80 p-8 animate-reveal border-brand/20">
          <h3 className="font-bold text-brand mb-6">{LABELS.LOG_NEW_CLINICAL}</h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">Cow Tag No.</label>
              <input className="input-machined" placeholder="e.g. C-101" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">Date</label>
              <input type="date" className="input-machined" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">Signs of Sickness (What did you see?)</label>
              <textarea className="input-machined min-h-[100px]" placeholder="Detailed description of symptoms..."></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">{LABELS.DIAGNOSIS}</label>
              <input className="input-machined" placeholder="e.g. Mastitis, Milk Fever" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">{LABELS.MEDICATIONS_PRESCRIBED}</label>
              <input className="input-machined" placeholder="Name and dosage" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-ink/60 uppercase">{LABELS.RECOMMENDATIONS_REMARKS}</label>
              <textarea className="input-machined" placeholder="Follow-up instructions..."></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-command bg-surface-raised text-ink hover:bg-ink/10">{LABELS.CANCEL}</button>
              <button type="submit" className="btn-command">Save Record</button>
            </div>
          </form>
        </div>
      )}

      {/* VISIT HISTORY TABLE */}
      <div className="card-machined bg-surface/80 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-brand/10 text-ink-muted">
            <tr>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Date</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Cow</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">{LABELS.DIAGNOSIS}</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">{LABELS.MEDICATIONS_PRESCRIBED}</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">{LABELS.VIEW_DETAIL}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {encounters.map((visit) => (
              <tr key={visit.id} className="hover:bg-surface/55">
                <td className="p-4 font-mono text-xs text-ink-strong">{visit.date}</td>
                <td className="p-4 font-bold text-brand">{visit.cow}</td>
                <td className="p-4 text-sm text-ink-strong">{visit.diagnosis}</td>
                <td className="p-4 text-sm text-ink-muted">{visit.meds}</td>
                <td className="p-4 text-brand font-bold cursor-pointer hover:underline" onClick={() => setSelectedRecord(visit)}>Open File →</td>

                    {/* RECORD DETAIL MODAL */}
                    <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Medical Record Details">
                      {selectedRecord && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase text-ink-muted mb-1">Date</p>
                              <p className="text-sm font-mono text-ink-strong">{selectedRecord.date}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase text-ink-muted mb-1">Cow</p>
                              <p className="text-sm font-bold text-brand">{selectedRecord.cow}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase text-ink-muted mb-1">Signs of Sickness</p>
                            <p className="text-sm text-ink-strong">{selectedRecord.reason}</p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase text-ink-muted mb-1">Diagnosis</p>
                            <p className="text-sm text-ink-strong">{selectedRecord.diagnosis}</p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase text-ink-muted mb-1">Medications Prescribed</p>
                            <p className="text-sm text-ink-strong">{selectedRecord.meds}</p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase text-ink-muted mb-1">Recommendations</p>
                            <p className="text-sm text-ink-strong">{selectedRecord.recommendations}</p>
                          </div>

                          <div className="border-t border-ink/10 pt-4 flex justify-end gap-3">
                            <button onClick={() => setSelectedRecord(null)} className="btn-command bg-surface-raised text-ink">
                              Close
                            </button>
                            <button className="btn-command">
                              Edit Record
                            </button>
                          </div>
                        </div>
                      )}
                    </Modal>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}