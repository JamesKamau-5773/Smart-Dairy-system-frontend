import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileWarning, Filter, Stethoscope, Wheat, ThermometerSun, Settings, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage, productionApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { normalizeMilkDropReport } from '../../lib/milkDropReport';
import { useTenant } from '../../hooks/useTenant';
import GroupedDateRows from '../../components/ui/GroupedDateRows';

const DIAGNOSTIC_CATEGORIES = [
  { id: 'clinical', label: 'Cow Health & Sickness', icon: Stethoscope, options: ['Signs of Mastitis (clots, swelling)', 'Lame or sore hooves', 'Metabolic sickness (Milk fever, etc.)', 'Not eating / Looks weak'] },
  { id: 'nutrition', label: 'Feed & Water', icon: Wheat, options: ['No clean water / Trough empty', 'Not enough feed given', 'Cow refused to eat the feed'] },
  { id: 'environmental', label: 'Weather & Environment', icon: ThermometerSun, options: ['Too hot / Heat stress', 'Heavy rain or muddy yard', 'Spooked by animals or loud noises'] },
  { id: 'routine', label: 'Milking Routine & Equipment', icon: Settings, options: ['Milking was late (over 30 mins)', 'Cow was nervous / Held back milk', 'Milking machine lost pressure'] },
];

export default function MilkDropReports() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();

  const [investigateModal, setInvestigateModal] = useState({ isOpen: false, log: null });
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [managerNotes, setManagerNotes] = useState('');
  const [formError, setFormError] = useState('');
  const { data: reportsData } = useQuery({
    queryKey: ['milk-drop-reports', tenantId, farmId],
    queryFn: () => productionApi.listMilkDropAlerts(),
    enabled: !!tenantId && !!farmId,
  });

  const reports = Array.isArray(reportsData)
    ? reportsData.map(normalizeMilkDropReport)
    : [];

  const saveInvestigation = useMutation({
    mutationFn: ({ alertId, ...payload }) => productionApi.investigateMilkDropAlert(alertId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milk-drop-reports', tenantId, farmId] });
      toast.success(variables.status === 'RESOLVED' ? 'Case closed.' : 'Investigation saved.');
      closeModal();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, 'Could not update this investigation. Check your connection and try again.'));
    },
  });

  const openInvestigateModal = (log) => {
    setInvestigateModal({ isOpen: true, log });
    setSelectedReasons(Array.isArray(log.selected_reasons) ? log.selected_reasons : []);
    setManagerNotes(log.investigation_notes || '');
    setFormError('');
  };

  const closeModal = () => setInvestigateModal({ isOpen: false, log: null });

  const toggleReason = (reason) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = (status = 'INVESTIGATING') => {
    if (status === 'RESOLVED' && selectedReasons.length === 0 && !managerNotes.trim()) {
      setFormError('Add at least one finding or a manager note before closing the case.');
      return;
    }

    setFormError('');
    saveInvestigation.mutate({
      alertId: investigateModal.log?.id,
      status,
      selected_reasons: selectedReasons,
      notes: managerNotes.trim(),
    });
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

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-surface shadow-sm">
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-ink/50">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Cow</th>
              <th className="px-6 py-3">Missing Milk</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            <GroupedDateRows
              items={reports}
              getDate={(report) => report.date_time}
              colSpan={4}
              renderGroupMeta={(items) => `${items.length} ${items.length === 1 ? 'alert' : 'alerts'}`}
              renderItem={(report) => (
              <tr key={report.id} className="hover:bg-brand/5">
                <td className="px-6 py-4">{new Date(report.date_time).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{formatCowIdentity(report)}</td>
                <td className="px-6 py-4 font-bold text-brand-dark">-{Number(report.missing_milk).toFixed(1)} L</td>
                <td className="px-6 py-4">
                  {report.status === 'OPEN' ? (
                    <button onClick={() => openInvestigateModal(report)} className="text-brand font-bold">Check Cow</button>
                  ) : report.status === 'INVESTIGATING' ? (
                    <button onClick={() => openInvestigateModal(report)} className="font-bold text-brand-dark">Investigating</button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-brand"><CheckCircle2 size={14} /> Closed</span>
                  )}
                </td>
              </tr>
              )}
              empty={reports.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-center text-ink/50" colSpan={4}>
                  No milk drop alerts recorded yet.
                </td>
              </tr>
              )}
            />
          </tbody>
        </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {reports.map((report) => (
            <article key={report.id} className="min-w-0 space-y-3 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <time className="text-xs text-ink-muted">{new Date(report.date_time).toLocaleDateString()}</time>
                  <h3 className="mt-1 break-words font-semibold text-ink">{formatCowIdentity(report)}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-dark">{report.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-sm">
                <span className="text-ink-muted">Missing milk</span>
                <span className="font-mono font-bold tabular-nums text-brand-dark">-{Number(report.missing_milk).toFixed(1)} L</span>
              </div>
              {report.status !== 'RESOLVED' && <button type="button" onClick={() => openInvestigateModal(report)} className="w-full rounded-button bg-brand px-3 py-2 text-sm font-semibold text-white">{report.status === 'OPEN' ? 'Check cow' : 'Continue investigation'}</button>}
            </article>
          ))}
          {reports.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No milk drop alerts recorded yet.</p>}
        </div>
      </div>

      {investigateModal.isOpen && createPortal((
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain p-3 backdrop-blur-sm touch-pan-y sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Investigate milk drop" className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:max-h-[90dvh]">
            <div className="flex shrink-0 items-start justify-between border-b border-ink/10 p-4 sm:p-6">
              <div>
                <h3 className="text-lg font-bold">Investigate {formatCowIdentity(investigateModal.log)}</h3>
                <p className="mt-1 text-xs text-ink-muted">Save progress while reviewing, then close the case once the cause is confirmed.</p>
              </div>
              <button onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-6">
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
              {formError && <p role="alert" className="text-sm font-semibold text-danger">{formError}</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-ink/10 p-4 sm:p-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold">Cancel</button>
              <button type="button" onClick={() => handleSubmit('INVESTIGATING')} disabled={saveInvestigation.isPending} className="px-6 py-2 border border-brand/20 bg-surface text-brand text-sm font-bold rounded-md disabled:opacity-60">
                {saveInvestigation.isPending ? 'Saving...' : investigateModal.log.status === 'OPEN' ? 'Start Investigation' : 'Save Progress'}
              </button>
              {investigateModal.log.status === 'INVESTIGATING' && (
                <button type="button" onClick={() => handleSubmit('RESOLVED')} disabled={saveInvestigation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-6 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <CheckCircle2 size={16} /> Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
