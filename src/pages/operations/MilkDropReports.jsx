import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileWarning, Download, Filter, AlertCircle, ChevronRight, Stethoscope, Wheat, ThermometerSun, Settings, X } from 'lucide-react';

const DIAGNOSTIC_CATEGORIES = [
  { id: 'clinical', label: 'Cow Health & Sickness', icon: Stethoscope, options: ['Signs of Mastitis (clots, swelling)', 'Lame or sore hooves', 'Metabolic sickness (Milk fever, etc.)', 'Not eating / Looks weak'] },
  { id: 'nutrition', label: 'Feed & Water', icon: Wheat, options: ['No clean water / Trough empty', 'Not enough feed given', 'Cow refused to eat the feed'] },
  { id: 'environmental', label: 'Weather & Environment', icon: ThermometerSun, options: ['Too hot / Heat stress', 'Heavy rain or muddy yard', 'Spooked by animals or loud noises'] },
  { id: 'routine', label: 'Milking Routine & Equipment', icon: Settings, options: ['Milking was late (over 30 mins)', 'Cow was nervous / Held back milk', 'Milking machine lost pressure'] },
];

export default function MilkDropReports() {
  const queryClient = useQueryClient();
  
  // FIXED: State must be declared at the top of the component
  const [investigateModal, setInvestigateModal] = useState({ isOpen: false, log: null });
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [managerNotes, setManagerNotes] = useState('');

  const { data: reportsData, isLoading, isError } = useQuery({
    queryKey: ['milk-drop-reports', 'mock'], 
    queryFn: () => new Promise((resolve) => setTimeout(() => resolve([
      { id: 1, date_time: new Date().toISOString(), cow_tag: 'Bessie (Tag: 402)', missing_milk: 2.5, primary_reason: '', status: 'Pending' },
      { id: 2, date_time: new Date(Date.now() - 86400000).toISOString(), cow_tag: 'Daisy (Tag: 118)', missing_milk: 3.0, primary_reason: 'No clean water / Trough empty', status: 'Resolved' },
    ]), 500)),
  });

  const reports = Array.isArray(reportsData) ? reportsData : [];

  const { data: suggestion, isLoading: isSuggesting } = useQuery({
    queryKey: ['diagnostic-suggestion', investigateModal.log?.id],
    queryFn: () => new Promise((resolve) => setTimeout(() => resolve({
      recommended_category: "Milking Routine & Equipment",
      confidence: 85,
      reasoning: "Herdsman logged a delayed morning shift today.",
      suggested_tags: ["Milking was late (over 30 mins)"]
    }), 1200)),
    enabled: !!investigateModal.log?.id,
  });

  const saveInvestigation = useMutation({
    mutationFn: (payload) => new Promise((resolve) => setTimeout(resolve, 800)),
    onSuccess: () => closeModal(),
  });

  const openInvestigateModal = (log) => {
    setInvestigateModal({ isOpen: true, log });
    setSelectedReasons([]);
    setManagerNotes('');
  };

  const closeModal = () => setInvestigateModal({ isOpen: false, log: null });

  const toggleReason = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = () => {
    saveInvestigation.mutate({ reasons: selectedReasons, manager_notes: managerNotes });
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto font-sans animate-reveal">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand mb-1">
            <FileWarning size={24} />
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Low Milk Alerts</h1>
          </div>
          <p className="text-xs sm:text-sm text-ink/50 font-medium">Investigate yield drops per cow.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface text-ink border border-ink/20 rounded-md text-sm font-semibold hover:bg-surface-raised">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-surface border border-ink/10 rounded-lg overflow-x-auto shadow-sm">
        {/* Table content logic remains as your previous version */}
        <table className="w-full text-left text-sm whitespace-nowrap">
          {/* Table headers and rows */}
          <tbody className="divide-y divide-ink/5">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-brand/5">
                <td className="px-6 py-4">{new Date(report.date_time).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{report.cow_tag}</td>
                <td className="px-6 py-4 text-danger font-bold">-{Number(report.missing_milk).toFixed(1)} L</td>
                <td className="px-6 py-4">
                  {report.status === 'Pending' ? <button onClick={() => openInvestigateModal(report)} className="text-brand font-bold">Check Cow</button> : 'Resolved'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {investigateModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-ink/10 flex justify-between items-start">
              <h3 className="text-lg font-bold">Investigate {investigateModal.log.cow_tag}</h3>
              <button onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DIAGNOSTIC_CATEGORIES.map(cat => (
                  <div key={cat.id} className="p-4 rounded-xl border border-ink/10 bg-surface-raised">
                    <p className="font-bold text-sm mb-2">{cat.label}</p>
                    {cat.options.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedReasons.includes(opt)} onChange={() => toggleReason(opt)} /> {opt}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <textarea 
                value={managerNotes} 
                onChange={(e) => setManagerNotes(e.target.value)} 
                className="w-full p-3 border border-ink/20 rounded-lg text-sm" 
                placeholder="Add notes..." 
                rows={3} 
              />
            </div>
            <div className="p-4 sm:p-6 border-t border-ink/10 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-brand text-surface text-sm font-bold rounded-md">Save Findings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}