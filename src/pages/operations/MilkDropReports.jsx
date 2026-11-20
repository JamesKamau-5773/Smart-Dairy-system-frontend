import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../../components/ui/BaseModal';
import toast from 'react-hot-toast';
import { getApiErrorMessage, productionApi } from '../../lib/backendApi';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatAlertDate, normalizeMilkDropReport } from '../../lib/milkDropReport';
import { useTenant } from '../../hooks/useTenant';
import GroupedDateRows from '../../components/ui/GroupedDateRows';
import { CardSkeletons, ListLoadNotices, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { formatLitres } from '../../lib/numberFormat';
import { healthCopy } from '../../i18n/health';
import { enumLabel } from '../../lib/enumLabel';

const TABLE_COLUMNS = 4;

/** "−4.5 L" for the milk a cow is short; "—" when the backend sent no figure. */
const formatMissingMilk = (litres) => {
  const text = formatLitres(litres);
  return text === '—' ? text : `−${text}`;
};

// `options` are the findings as saved with the case; the screen shows them in the chosen language.
const DIAGNOSTIC_CATEGORIES = [
  { id: 'clinical', options: ['Signs of Mastitis (clots, swelling)', 'Lame or sore hooves', 'Metabolic sickness (Milk fever, etc.)', 'Not eating / Looks weak'] },
  { id: 'nutrition', options: ['No clean water / Trough empty', 'Not enough feed given', 'Cow refused to eat the feed'] },
  { id: 'environmental', options: ['Too hot / Heat stress', 'Heavy rain or muddy yard', 'Spooked by animals or loud noises'] },
  { id: 'routine', options: ['Milking was late (over 30 mins)', 'Cow was nervous / Held back milk', 'Milking machine lost pressure'] },
];

export default function MilkDropReports() {
  const copy = healthCopy.milkDrop;
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();

  const [investigateModal, setInvestigateModal] = useState({ isOpen: false, log: null });
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [managerNotes, setManagerNotes] = useState('');
  const [formError, setFormError] = useState('');
  const reportsQuery = useQuery({
    queryKey: ['milk-drop-reports', tenantId, farmId],
    queryFn: () => productionApi.listMilkDropAlerts(),
    enabled: !!tenantId && !!farmId,
  });
  const loadState = getListLoadState(reportsQuery);
  const showReports = hasRowsToShow(loadState);

  const reports = Array.isArray(reportsQuery.data)
    ? reportsQuery.data.map(normalizeMilkDropReport)
    : [];

  const saveInvestigation = useMutation({
    mutationFn: ({ alertId, ...payload }) => productionApi.investigateMilkDropAlert(alertId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milk-drop-reports', tenantId, farmId] });
      toast.success(variables.status === 'RESOLVED' ? copy.caseClosed : copy.investigationSaved);
      closeModal();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, copy.saveFailed));
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
      setFormError(copy.needFinding);
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-reveal">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <div className="text-brand mb-1">
            <h1 className="text-page-title text-ink">{copy.title}</h1>
          </div>
          <p className="text-meta text-ink/50">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-surface text-ink border border-ink/20 rounded-md text-control hover:bg-surface-raised">

    {copy.filter}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-surface shadow-sm">
        <ListLoadNotices state={loadState} label={copy.listLabel} error={reportsQuery.error} onRetry={reportsQuery.refetch} />
        {loadState === 'loading' && (
          <div aria-busy="true">
            <table className="hidden w-full md:table"><tbody><TableSkeletonRows columns={TABLE_COLUMNS} /></tbody></table>
            <div className="divide-y divide-ink/10 md:hidden"><CardSkeletons /></div>
          </div>
        )}
        {showReports && (<>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-body">
          <thead>
            <tr className="border-b border-ink/10 text-label text-ink/50">
              <th className="px-6 py-3">{copy.columns.date}</th>
              <th className="px-6 py-3">{copy.columns.cow}</th>
              <th className="px-6 py-3">{copy.columns.missing}</th>
              <th className="px-6 py-3">{copy.columns.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            <GroupedDateRows
              items={reports}
              getDate={(report) => report.date_time}
              colSpan={TABLE_COLUMNS}
              renderGroupMeta={(items) => copy.alertCount(items.length)}
              renderItem={(report) => (
              <tr key={report.id} className="hover:bg-brand/5">
                <td className="px-6 py-4">{formatAlertDate(report.date_time)}</td>
                <td className="px-6 py-4 text-body-strong">{formatCowIdentity(report)}</td>
                <td className="px-6 py-4 text-body-strong text-brand-dark">{formatMissingMilk(report.missing_milk)}</td>
                <td className="px-6 py-4">
                  {report.status === 'OPEN' ? (
                    <button onClick={() => openInvestigateModal(report)} className="text-brand text-control">{copy.checkCow}</button>
                  ) : report.status === 'INVESTIGATING' ? (
                    <button onClick={() => openInvestigateModal(report)} className="text-control text-brand-dark">{copy.investigating}</button>
                  ) : (
                    <span className="inline-flex items-center text-body-strong text-brand">
                    {copy.closed}</span>
                  )}
                </td>
              </tr>
              )}
              empty={reports.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-center text-ink/50" colSpan={TABLE_COLUMNS}>{copy.empty}</td>
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
                  <time className="text-meta text-ink-muted">{formatAlertDate(report.date_time)}</time>
                  <h2 className="mt-1 break-words text-section-title text-ink">{formatCowIdentity(report)}</h2>
                </div>
                <span className="shrink-0 rounded-full border border-brand/20 bg-brand-50 px-2 py-1 text-badge text-brand-dark">{enumLabel(copy.statuses, report.status)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-body">
                <span className="text-ink-muted">{copy.missingMilk}</span>
                <span className="text-body-strong tabular-nums text-brand-dark">{formatMissingMilk(report.missing_milk)}</span>
              </div>
              {report.status !== 'RESOLVED' && <button type="button" onClick={() => openInvestigateModal(report)} className="w-full rounded-button bg-brand px-3 py-2 text-control text-white">{report.status === 'OPEN' ? copy.checkCowShort : copy.continueInvestigation}</button>}
            </article>
          ))}
          {reports.length === 0 && <p className="p-6 text-center text-body text-ink-muted">{copy.empty}</p>}
        </div>
        </>)}
      </div>

      <BaseModal
        isOpen={investigateModal.isOpen}
        onClose={closeModal}
        title={investigateModal.log ? copy.investigateTitle(formatCowIdentity(investigateModal.log)) : ''}
        subtitle={copy.investigateHint}
        size="3xl"
        footerActions={investigateModal.log && (
          <>
            <button onClick={closeModal} className="px-4 py-2 text-control">{copy.cancel}</button>
            <button type="button" onClick={() => handleSubmit('INVESTIGATING')} disabled={saveInvestigation.isPending} className="px-6 py-2 border border-brand/20 bg-surface text-brand text-control rounded-md disabled:opacity-60">
              {saveInvestigation.isPending ? copy.saving : investigateModal.log.status === 'OPEN' ? copy.start : copy.saveProgress}
            </button>
            {investigateModal.log.status === 'INVESTIGATING' && (
              <button type="button" onClick={() => handleSubmit('RESOLVED')} disabled={saveInvestigation.isPending} className="inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-6 py-2 text-control text-white shadow-md transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">

    {copy.closeCase}
              </button>
            )}
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIAGNOSTIC_CATEGORIES.map(cat => (
              <div key={cat.id} className="p-4 rounded-xl border border-ink/10 bg-surface-raised">
                <p className="text-body-strong mb-2">{copy.categories[cat.id]}</p>
                {cat.options.map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-field-label text-ink-muted">
                    <input type="checkbox" checked={selectedReasons.includes(opt)} onChange={() => toggleReason(opt)} /> {copy.reasons[opt] ?? opt}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            className="input-machined w-full text-control"
            placeholder={copy.notesPlaceholder}
            rows={3}
          />
          {formError && <p role="alert" className="text-body-strong text-danger">{formError}</p>}
        </div>
      </BaseModal>
    </div>
  );
}
