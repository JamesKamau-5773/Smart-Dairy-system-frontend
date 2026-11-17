import { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../lib/backendApi';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { useRoutinePlans, useSaveRoutinePlans } from '../../hooks/useRoutinePlans';
import { useFormDraft } from '../../hooks/useFormDraft';
import { CardSkeletons, ListLoadNotices } from '../../components/ui/ListLoadState';
import DraftRestoredNotice from '../../components/ui/DraftRestoredNotice';
import { dashboardCopy } from '../../i18n/dashboard';
import { shellCopy } from '../../i18n/shell';

const DRAFT_KEY = 'routine-plan';

// Unsaved edits are checklist texts keyed by time block id.
const hasNoEdits = (edits) => !edits || Object.keys(edits).length === 0;
const countSteps = (text) => String(text ?? '').split('\n').map((step) => step.trim()).filter(Boolean).length;

/**
 * Daily Routine Planner: the manager writes the checklist for each time block of the day;
 * the herdsman sees it in the Farm Task View. The time blocks are the backend's. Changes
 * stay as an unsaved draft on this phone (per user and farm) until "Save Routine".
 */
export default function DailyRoutinePlanner() {
  const copy = dashboardCopy.routine;
  const plansQuery = useRoutinePlans();
  const saveRoutine = useSaveRoutinePlans();
  const loadState = getListLoadState(plansQuery);
  const plans = plansQuery.data ?? [];

  const [edits, setEdits] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState('');
  const draft = useFormDraft(DRAFT_KEY, edits, setEdits, { isEmpty: hasNoEdits });

  const tasks = plans.map((plan) => (
    Object.hasOwn(edits, plan.id) ? { ...plan, checklist: edits[plan.id] } : plan
  ));
  const changedCount = plans.filter((plan) => Object.hasOwn(edits, plan.id) && edits[plan.id] !== plan.checklist).length;
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;

  const handleChecklistChange = (text) => {
    if (!activeTask) return;
    setEdits((current) => ({ ...current, [activeTask.id]: text }));
    setSaveError('');
  };

  const startOver = () => {
    draft.clearDraft();
    setEdits({});
  };

  const handleSave = () => {
    setSaveError('');
    saveRoutine.mutate(tasks, {
      onSuccess: () => {
        draft.clearDraft();
        setEdits({});
        setLastSavedAt(new Date());
        toast.success(copy.saved);
      },
      onError: (error) => {
        setSaveError(offlineFailureMessage(error, copy.notSaved) ?? getApiErrorMessage(error, copy.saveFailed));
      },
    });
  };

  const showPlans = hasRowsToShow(loadState);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-reveal">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.94),rgba(255,255,255,0.98))] p-5 sm:p-6 ">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-page-title text-brand">{shellCopy.nav.items.dailyRoutine}</h1>
            <p className="mt-2 max-w-2xl text-body text-ink">
              {copy.subtitle}
            </p>
          </div>

          {showPlans && plans.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-badge text-ink-muted">
              <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{copy.blocks(tasks.length)}</span>
              <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{copy.withNotes(tasks.filter((task) => countSteps(task.checklist) > 0).length)}</span>
              <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{copy.activeSteps(countSteps(activeTask?.checklist))}</span>
              {changedCount > 0 ? (
                <span className="rounded-full border border-warning-500/40 bg-warning-50 px-3 py-1 text-warning-700">
                  {copy.unsaved(changedCount)}
                </span>
              ) : lastSavedAt && (
                <span className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-brand">
                  {copy.savedAt(lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {draft.restored && changedCount > 0 && (
        <DraftRestoredNotice onStartOver={startOver} onDismiss={draft.dismissRestored} />
      )}

      {loadState !== 'ready' && (
        <div className="overflow-hidden rounded-card border border-ink/10 bg-surface">
          <ListLoadNotices state={loadState} label={copy.listLabel} error={plansQuery.error} onRetry={plansQuery.refetch} />
          {loadState === 'loading' && <div className="divide-y divide-ink/10" aria-busy="true"><CardSkeletons rows={3} /></div>}
        </div>
      )}

      {showPlans && plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-ink/10 bg-surface-warm/60 p-5 text-body text-ink-muted">
          {copy.empty}
        </div>
      )}

      {showPlans && plans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN: The Schedule List */}
          <div className="lg:col-span-2 card-machined bg-surface p-6  border border-ink/10">
            <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-4">
              <h2 className="text-section-title text-ink-muted">

                {copy.dailyTasks}
              </h2>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  aria-pressed={activeTask?.id === task.id}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    activeTask?.id === task.id
                      ? 'bg-brand/5 border-brand/30'
                      : 'bg-surface hover:bg-surface-raised border-ink/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className={`text-meta tabular-nums block mb-1 ${
                        activeTask?.id === task.id ? 'text-brand' : 'text-ink-muted'
                      }`}>
                        {task.time}
                      </span>
                      <span className={`text-body-strong ${
                        activeTask?.id === task.id ? 'text-brand-dark' : 'text-ink-strong'
                      }`}>
                        {task.title}
                      </span>
                    </div>

                    {countSteps(task.checklist) > 0 && (
                      <div className="hidden md:flex items-center text-meta text-ink-muted bg-surface-warm px-2 py-1 rounded">

                        {copy.notesAdded}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-ink/10 pt-4">
              {saveError && <p role="alert" className="text-body-strong text-danger">{saveError}</p>}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveRoutine.isPending || changedCount === 0}
                className="btn-command bg-brand text-surface flex items-center px-6 disabled:opacity-60"
              >
                {saveRoutine.isPending ? copy.saving : copy.save}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: The Sticky Notes Editor */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="card-machined bg-surface-warm/40 p-6 border border-brand/15  rounded-2xl">
              <h2 className="text-section-title text-brand mb-1">
                {copy.instructionsFor}
              </h2>
              <p className="text-body-strong text-ink-strong mb-4 border-b border-ink/10 pb-4">
                {activeTask?.title || copy.defaultTitle}
              </p>

              <label htmlFor="routine-checklist" className="block text-field-label text-ink-muted mb-2">
                {copy.checklistLabel}
              </label>

              <textarea
                id="routine-checklist"
                value={activeTask?.checklist ?? ''}
                onChange={(event) => handleChecklistChange(event.target.value)}
                placeholder={copy.checklistPlaceholder}
                className="w-full h-64 p-4 rounded-xl border border-ink/20 focus:border-brand focus:ring-1 focus:ring-brand bg-white text-control text-ink-strong resize-none transition-colors"
              />

              <p className="text-meta text-ink-muted mt-3 text-center">
                {copy.draftHint}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
