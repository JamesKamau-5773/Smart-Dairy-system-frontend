import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { inventoryApi } from '../../lib/backendApi';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { convertKgToLocal } from '../../lib/units';
import { useRoutinePlans } from '../../hooks/useRoutinePlans';
import { useUnitConversions } from '../../hooks/useUnitConversions';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { CardSkeletons, ListLoadNotices } from '../../components/ui/ListLoadState';
import AlertBanner from '../../components/ui/AlertBanner';
import { reportError } from '../../lib/telemetry';
import { dashboardCopy } from '../../i18n/dashboard';
import { shellCopy } from '../../i18n/shell';

export default function HerdsmanView() {
  const copy = dashboardCopy.herdsman;
  // Calf form moved to Herd Registry to keep barn-floor UI focused.
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const queryClient = useQueryClient();

  // The routine the manager saved in the Daily Routine Planner, from the backend.
  const routineQuery = useRoutinePlans();
  const routineLoadState = getListLoadState(routineQuery);
  const readOnlySchedule = routineQuery.data ?? [];
  // The farm's unit helpers (Unit Helpers page), to show feed in local measures.
  const unitConversions = useUnitConversions().data ?? [];

  const getContextForFeed = (feed) => {
    const id = (feed.inventory_item_id || '').toString().toLowerCase();
    const conc = (feed.concentrate || '').toString().toLowerCase();
    if (id.includes('dairymeal') || conc.includes('dairy')) return copy.dairyMeal;
    return copy.feed;
  };

  const getFeedInstructionLabel = (feed) => {
    const context = getContextForFeed(feed);
    const conv = convertKgToLocal(unitConversions, feed.inventory_item_id, feed.numeric_quantity);
    if (conv.wasConverted) {
      return copy.give(conv.value, conv.unit, context);
    }

    return copy.give(feed.numeric_quantity, 'kg', context);
  };

  // Alerts from the farm system (Barn Floor Language)
  const [priorityAlerts, setPriorityAlerts] = useState([]);

  // Undoable optimistic dismiss for priority alerts: remove from UI immediately, show snackbar,
  // and only persist after the undo window closes.
  const [pendingDismissals, setPendingDismissals] = useState([]); // { id, alert }

  const handlePriorityAlertComplete = (alert) => {
    if (feedTaskMutation.isPending) return;

    // Optimistically remove the alert so the herdsman sees immediate feedback
    setPriorityAlerts((prev) => prev.filter((a) => a.id !== alert.id));

    // Add to pending dismissals so the snackbar can offer Undo before persistence
    setPendingDismissals((prev) => [...prev, { id: alert.id, alert }]);
  };

  const handleFinalizeDismissal = (id, alert) => {
    setPendingDismissals((prev) => prev.filter((p) => p.id !== id));

    feedTaskMutation.mutate(
      {
        cow: alert.cow.split(' ')[0],
        status: alert.type,
        concentrate: 'n/a',
        numeric_quantity: 0,
        inventory_item_id: null,
      },
      {
        onError: (error) => {
          setPriorityAlerts((prev) => [alert, ...prev]);
          reportError(error, { where: 'HerdsmanView.dismissAlert' });
          setErrorMessage(copy.dismissFailed);
        },
      }
    );
  };

  const handleUndoDismissal = (id, alert) => {
    setPendingDismissals((prev) => prev.filter((p) => p.id !== id));
    setPriorityAlerts((prev) => [alert, ...prev]);
  };

  // Feed plan for the herd (Barn Floor Language for roughage)
  const [feedInstructions, setFeedInstructions] = useState([]);

  const { currentUser } = useAuth();
  const { tenantId, farmId } = useTenant();

  const feedTaskMutation = useMutation({
    mutationFn: async (feedTask) => {
      const payload = {
        item_id: feedTask.inventory_item_id,
        quantity: feedTask.numeric_quantity,
        reference_note: `Automated deduction: ${feedTask.status} ration for ${feedTask.cow}`,
        logged_by: currentUser?.id || null,
      };

      const response = await inventoryApi.deduct(payload);
      return { response, feedTask };
    },
    onSuccess: ({ response, feedTask }) => {
      setFeedInstructions((prev) => prev.filter((f) => f.cow !== feedTask.cow));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId) });
      setSuccessMessage(copy.feedLogged(feedTask.cow));

      if (response?.reorder_alert) {
        setErrorMessage(copy.lowStock(feedTask.concentrate, response.new_balance, response.unit));
      }
    },
    onError: (error) => {
      reportError(error, { where: 'HerdsmanView.logFeeding' });
        setErrorMessage(copy.feedFailed);
    },
  });

  return (
    <div className="animate-reveal space-y-8 max-w-6xl mx-auto">
      {successMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner
            type="success"
            title={copy.taskLogged}
            message={successMessage}
            autoDismiss={2400}
            onDismiss={() => setSuccessMessage('')}
          />
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner
            type="danger"
            title={copy.actionFailed}
            message={errorMessage}
            autoDismiss={4000}
            onDismiss={() => setErrorMessage('')}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <h1 className="text-page-title text-brand m-0">
            {/* The sidebar's label for this page: one key for both. */}
            {shellCopy.nav.items.farmTasks}
          </h1>
          <p className="text-meta text-ink-muted mt-2 tabular-nums">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          
          <div className="text-label text-ink-muted">{copy.currentShift}</div>
          <div className="text-body-strong text-brand">

    {copy.morningMilking}
          </div>
          {/* Herd registry link removed to keep barn-floor UI focused */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 ">
          <div>
            <div>
              <p className="text-label text-ink-muted">{copy.activeAlerts}</p>
              <p className="mt-2 text-stat-value text-ink">{priorityAlerts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 ">
          <div>
            <div>
              <p className="text-label text-ink-muted">{copy.feedTasks}</p>
              <p className="mt-2 text-stat-value text-ink">{feedInstructions.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 ">
          <div>
            <div>
              <p className="text-label text-ink-muted">{copy.undoQueue}</p>
              <p className="mt-2 text-stat-value text-ink">{pendingDismissals.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-machined p-8 bg-surface">
            {/* ── Today's Plan Module ── */}

            <h2 className="text-section-title text-brand mb-4">

    {copy.todaysPlan}
            </h2>
            {/* OPTIMIZED: High-contrast slate weights, cleaner tracking, and crisp line spacing */}
            <p className="max-w-prose text-body-strong text-ink mb-6">
              {copy.planHint}
            </p>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {routineLoadState !== 'ready' && (
                <div className="overflow-hidden rounded-lg border border-ink/10">
                  <ListLoadNotices state={routineLoadState} label={copy.routineLabel} error={routineQuery.error} onRetry={routineQuery.refetch} />
                  {routineLoadState === 'loading' && <div aria-busy="true"><CardSkeletons rows={2} /></div>}
                </div>
              )}
              {hasRowsToShow(routineLoadState) && readOnlySchedule.length === 0 && (
                <div className="rounded-lg border border-dashed border-ink/10 bg-surface-warm p-4 text-body text-ink-muted">
                  {copy.noRoutine}
                </div>
              )}
              {readOnlySchedule.map((task) => (
                <div key={task.id} className="rounded-lg border border-ink/5 bg-surface-warm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-meta tabular-nums text-ink-muted">{task.time}</div>
                      <div className="text-body-strong text-ink mt-1">{task.title}</div>
                      {task.description && task.description !== task.title && (
                        <p className="text-body text-ink-muted mt-3">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-body text-ink">
                    {task.checklist.split('\n').map((step) => step.trim()).filter(Boolean).map((step, index) => (
                      <li key={`${task.id}-${index}`} className="flex items-start gap-2">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                        <span className="">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="card-machined p-8 bg-surface">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="max-w-2xl">
                <h2 className="text-section-title text-brand">

    {copy.feedMix}
                </h2>
                <p className="mt-2 max-w-prose text-body-strong text-ink">
                  {copy.feedMixHint}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-brand/15 bg-brand/5 px-4 py-2 text-badge text-brand whitespace-nowrap">
                {copy.cowCount(feedInstructions.length)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 auto-rows-max">
              {feedInstructions.map((feed) => {
                const conv = convertKgToLocal(unitConversions, feed.inventory_item_id, feed.numeric_quantity);
                return (
                  <div key={feed.cow} className="rounded-xl border border-ink/5 bg-surface-warm p-5  hover: transition-shadow">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <Link to={`/operations/animal/${feed.cow}`} className="text-body-strong text-brand hover:underline">
                        {feed.cow}
                      </Link>
                      <span className="text-badge text-ink-muted bg-surface-raised px-2 py-1 rounded-full whitespace-nowrap">
                        {feed.status}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="block text-label text-ink/50">{copy.dairyMeal}</span>
                        <div className="text-body-strong text-ink-muted mb-2">{getFeedInstructionLabel(feed)}</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-stat-value text-brand">{conv.value}</div>
                          <div className="text-body-strong text-ink-muted">{conv.unit}</div>
                        </div>
                        <div className="text-meta text-ink-muted mt-1">({feed.numeric_quantity} kg)</div>
                      </div>
                      <div className="border-t border-ink/5 pt-4 space-y-2">
                        <span className="block text-label text-ink/50">{copy.baseFeed}</span>
                        <strong className="block text-ink text-body">{feed.forage}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-section-title text-brand">

    {copy.needsAttention}
            </h2>
            <span className="bg-danger text-white text-badge px-3 py-1.5 rounded-full whitespace-nowrap">
              {copy.alertCount(priorityAlerts.length)}
            </span>
          </div>

          <div className="space-y-5">
            {priorityAlerts.map((alert) => (
              <div key={alert.id} className="card-machined p-5 bg-surface flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-l-4 border-l-brand hover:bg-surface-raised transition-colors ">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    alert.type === 'heat' ? 'bg-accent/20 text-accent-dark' :
                    alert.type === 'vet' ? 'bg-danger/10 text-danger' :
                    'bg-ink/10 text-ink-muted'
                  }`}>
                    {alert.icon}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/operations/animal/${alert.cow.split(' ')[0]}`} className="text-body-strong text-brand hover:underline">
                      {alert.cow}
                    </Link>
                    <p className="text-body text-ink-muted mt-1.5">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:flex-col lg:items-end flex-shrink-0">
                  <span className="text-badge text-ink/60 bg-surface-warm px-2.5 py-1 rounded tabular-nums">{alert.time}</span>
                  <button
                    onClick={() => handlePriorityAlertComplete(alert)}
                    disabled={feedTaskMutation.isPending}
                    className="flex items-center gap-1.5 text-control text-brand hover:text-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {feedTaskMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} {copy.done}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Undo snackbars for pending dismissals */}
          <div className="fixed bottom-6 right-6 z-50 flex w-[min(92vw,420px)] flex-col-reverse gap-3">
            {pendingDismissals.map((p) => (
              <AlertBanner
                key={p.id}
                type="info"
                compact
                title={copy.logged(p.alert.cow)}
                message={copy.undoHint}
                action={{
                  label: copy.undo,
                  onClick: () => handleUndoDismissal(p.id, p.alert),
                }}
                onAutoDismiss={() => handleFinalizeDismissal(p.id, p.alert)}
                autoDismiss={6000}
                className=""
              />
            ))}
          </div>

          <div className="mt-10 p-6 bg-brand/8 border border-brand/25 rounded-xl flex flex-col gap-4 ">
            <div>
              <h3 className="text-section-title text-brand">{copy.readyToMilk}</h3>
              <p className="text-body text-ink-muted mt-1.5">{copy.readyHint}</p>
            </div>
            <Link to="/operations/clerk" className="btn-command flex items-center justify-center py-2.5">

    {copy.recordMilk}
            </Link>
          </div>
        </div>
      </div>

      {/* Calf creation moved to Herd Registry. */}
    </div>
  );
}
