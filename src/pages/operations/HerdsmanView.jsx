import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, AlertTriangle, ArrowRight, Clock, CheckCircle2, Droplets, Flame, Wheat, Baby, Loader2, ClipboardList } from 'lucide-react';
import { convertKgToLocal } from '../../lib/units';
import { loadScheduleTasks } from '../../lib/schedule';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';

export default function HerdsmanView() {
  // Calf form moved to Herd Registry to keep barn-floor UI focused.
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const queryClient = useQueryClient();

  const readOnlySchedule = loadScheduleTasks();

  const getContextForFeed = (feed) => {
    const id = (feed.inventory_item_id || '').toString().toLowerCase();
    const conc = (feed.concentrate || '').toString().toLowerCase();
    if (id.includes('dairymeal') || conc.includes('dairy')) return 'Dairy Meal';
    return 'Feed';
  };

  const getFeedInstructionLabel = (feed) => {
    const context = getContextForFeed(feed);
    const conv = convertKgToLocal(context, feed.numeric_quantity);
    if (conv.wasConverted) {
      return `Give ${conv.value} ${conv.unit} of ${context}`;
    }

    return `Give ${feed.numeric_quantity} kg of ${context}`;
  };

  // Alerts from the farm system (Barn Floor Language)
  const [priorityAlerts, setPriorityAlerts] = useState([
    { id: 1, type: 'heat', cow: 'C-102 (Luna)', message: 'Watch for signs of heat. Separate her for the vet.', time: '06:00 AM', icon: <Flame size={18} /> },
    { id: 2, type: 'vet', cow: 'C-105 (Bella)', message: 'Medicine period is over. Safe to put milk in the main tank.', time: 'Morning Milking', icon: <AlertTriangle size={18} /> },
    { id: 3, type: 'dry', cow: 'C-104 (Daisy)', message: 'Pregnant. Stop milking her starting today.', time: 'Action Required', icon: <Droplets size={18} className="opacity-50" /> },
  ]);

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
          console.error('Failed to persist alert completion', error);
          setErrorMessage('Could not persist action. The item was restored.');
        },
      }
    );
  };

  const handleUndoDismissal = (id, alert) => {
    setPendingDismissals((prev) => prev.filter((p) => p.id !== id));
    setPriorityAlerts((prev) => [alert, ...prev]);
  };

  // Feed plan for the herd (Barn Floor Language for roughage)
  const [feedInstructions, setFeedInstructions] = useState([
    { cow: 'C-101', status: 'High producer', concentrate: '4.5 kg', numeric_quantity: 4.5, inventory_item_id: 'uuid-dairymeal-0001', forage: 'As much as she wants' },
    { cow: 'C-104', status: 'Drying Off', concentrate: '0 kg', numeric_quantity: 0, inventory_item_id: 'uuid-dairymeal-0002', forage: 'Strictly Dry Fodder' },
  ]);

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

      const response = await apiClient.post('/v1/inventory/deduct', payload);
      return { response: response.data, feedTask };
    },
    onSuccess: ({ response, feedTask }) => {
      setFeedInstructions((prev) => prev.filter((f) => f.cow !== feedTask.cow));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY(tenantId, farmId) });
      setSuccessMessage(`Logged feed task for ${feedTask.cow}. Inventory has been updated.`);

      if (response?.reorder_alert) {
        setErrorMessage(`CRITICAL STOCK ALERT: ${feedTask.concentrate} is below the minimum threshold. Only ${response.new_balance} ${response.unit} remaining.`);
      }
    },
    onError: (error) => {
      console.error('Failed to log feeding', error);
      setErrorMessage('System Error: Could not deduct inventory. Proceed with feeding and notify the manager.');
    },
  });

  const handleFeedTaskComplete = (feedTask) => {
    if (feedTaskMutation.isPending) {
      return;
    }
    feedTaskMutation.mutate(feedTask);
  };

  const handleNewCalfSubmit = (event) => {
    event.preventDefault();
    setSuccessMessage(`Recorded calf ${newCalf.earTag}${newCalf.name ? ` (${newCalf.name})` : ''}`);
    setNewCalf({ earTag: '', name: '', mother: '' });
    setIsCalfModalOpen(false);
  };

  return (
    <div className="animate-reveal space-y-8 max-w-6xl mx-auto">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner
            type="success"
            title="Task Logged"
            message={successMessage}
            autoDismiss={2400}
            onDismiss={() => setSuccessMessage('')}
          />
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner
            type="danger"
            title="Action Failed"
            message={errorMessage}
            autoDismiss={4000}
            onDismiss={() => setErrorMessage('')}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent-dark text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Activity size={12} /> My Animals
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            My <span className="text-ink-muted">Herd</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Today's action plan for the barn floor.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          
          <div className="text-[10px] uppercase font-bold text-ink-muted">Current Shift</div>
          <div className="text-lg font-bold text-brand flex items-center gap-2">
            <Clock size={16} /> Morning Milking
          </div>
          {/* Herd registry link removed to keep barn-floor UI focused */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-machined p-8 bg-surface">
            {/* ── Today's Plan Module ── */}

            <h3 className="font-bold text-brand text-xl flex items-center gap-2 mb-4 tracking-tight">
              <ClipboardList size={20} className="text-accent" /> Today's Plan
            </h3>
            {/* OPTIMIZED: High-contrast slate weights, cleaner tracking, and crisp line spacing */}
            <p className="max-w-prose text-sm leading-7 font-semibold text-ink mb-6">
              Shift instructions from the manager. Review these objectives before starting and complete tasks in chronological order.
            </p>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {readOnlySchedule.map((task) => (
                <div key={task.id} className="rounded-lg border border-ink/5 bg-surface-warm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-wider text-ink-muted">{task.time}</div>
                      <div className="font-bold text-ink text-base mt-1">{task.title}</div>
                      <p className="text-sm text-ink-muted mt-3 leading-relaxed">{task.goal}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-ink leading-relaxed">
                    {task.checklist.split('\n').map((step, index) => (
                      <li key={`${task.id}-${index}`} className="flex items-start gap-2">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                        <span className="font-medium">{step.trim()}</span>
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
                <h3 className="font-bold text-brand text-xl flex items-center gap-2 tracking-tight">
                  <Wheat size={22} className="text-accent" /> Today's Feed Mix
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-7 font-semibold text-ink">
                  Dairy meal amounts based on yesterday's milk. Use these numbers to load each cow's ration accurately.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-brand/15 bg-brand/5 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-brand whitespace-nowrap">
                {feedInstructions.length} cow{feedInstructions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 auto-rows-max">
              {feedInstructions.map((feed) => {
                const context = getContextForFeed(feed);
                const conv = convertKgToLocal(context, feed.numeric_quantity);
                return (
                  <div key={feed.cow} className="rounded-xl border border-ink/5 bg-surface-warm p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <Link to={`/operations/animal/${feed.cow}`} className="font-bold text-brand hover:underline text-base">
                        {feed.cow}
                      </Link>
                      <span className="text-[10px] uppercase font-bold text-ink-muted bg-surface-raised px-2 py-1 rounded-full whitespace-nowrap">
                        {feed.status}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="block text-[10px] text-ink/50 uppercase font-semibold">Dairy Meal</span>
                        <div className="text-sm font-bold text-ink-muted mb-2">{getFeedInstructionLabel(feed)}</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-black text-brand leading-none">{conv.value}</div>
                          <div className="text-base font-bold text-ink-muted">{conv.unit}</div>
                        </div>
                        <div className="text-xs text-ink-muted mt-1">({feed.numeric_quantity} kg)</div>
                      </div>
                      <div className="border-t border-ink/5 pt-4 space-y-2">
                        <span className="block text-[10px] text-ink/50 uppercase font-semibold">Base Feed</span>
                        <strong className="block text-ink text-sm leading-relaxed">{feed.forage}</strong>
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
            <h3 className="font-bold text-brand text-lg flex items-center gap-2">
              <AlertTriangle size={22} className="text-danger" /> Needs Attention
            </h3>
            <span className="bg-danger text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              {priorityAlerts.length} alert{priorityAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-5">
            {priorityAlerts.map((alert) => (
              <div key={alert.id} className="card-machined p-5 bg-surface flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-l-4 border-l-brand hover:bg-surface-raised transition-colors shadow-sm">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    alert.type === 'heat' ? 'bg-accent/20 text-accent-dark' :
                    alert.type === 'vet' ? 'bg-danger/10 text-danger' :
                    'bg-ink/10 text-ink-muted'
                  }`}>
                    {alert.icon}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/operations/animal/${alert.cow.split(' ')[0]}`} className="font-bold text-base text-brand hover:underline">
                      {alert.cow}
                    </Link>
                    <p className="text-sm text-ink-muted font-medium mt-1.5 leading-snug">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:flex-col lg:items-end flex-shrink-0">
                  <span className="font-mono text-xs text-ink/60 bg-surface-warm px-2.5 py-1 rounded">{alert.time}</span>
                  <button
                    onClick={() => handlePriorityAlertComplete(alert)}
                    disabled={feedTaskMutation.isPending}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {feedTaskMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Done
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
                title={`Logged ${p.alert.cow}`}
                message="You can undo this action for a few seconds before it syncs."
                action={{
                  label: 'Undo',
                  onClick: () => handleUndoDismissal(p.id, p.alert),
                }}
                onAutoDismiss={() => handleFinalizeDismissal(p.id, p.alert)}
                autoDismiss={6000}
                className="shadow-2xl"
              />
            ))}
          </div>

          <div className="mt-10 p-6 bg-brand/8 border border-brand/25 rounded-xl flex flex-col gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-brand text-base">Ready to Milk?</h4>
              <p className="text-sm text-ink-muted mt-1.5">Check the alerts above, then enter the milk amounts.</p>
            </div>
            <Link to="/operations/yield" className="btn-command flex items-center justify-center gap-2 py-2.5">
              Record Milk <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Calf creation moved to Herd Registry. */}
    </div>
  );
}