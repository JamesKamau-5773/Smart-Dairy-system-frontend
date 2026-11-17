import { useMemo, useState } from 'react';
import Skeleton from '../../components/ui/Skeleton';
import { CardSkeletons, ListLoadMessage, ListLoadNotices, SlowLoadingHint } from '../../components/ui/ListLoadState';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AlertBanner from '../../components/ui/AlertBanner';
import BaseModal from '../../components/ui/BaseModal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import {
  LogAIServiceForm,
  LogHeatObservationForm,
  ManageSemenInventoryForm,
  RestockSemenInventoryForm,
} from '../../components/forms/breeding';
import {
  enrichBreedingLogCowIdentity,
  filterBreedingHistory,
  normalizeBreedingLog,
  normalizeHerdOption,
  normalizeSemenInventory,
} from '../../lib/breedingUtils';
import { breedingApi, getApiErrorMessage, herdApi } from '../../lib/backendApi';
import { formatCowIdentity, resolveCowIdentityFromHerd } from '../../lib/cowIdentity';
import { useTenant } from '../../hooks/useTenant';
import { ChevronRight, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { toLocalIsoDate } from '../../lib/localDate';
import { reportError } from '../../lib/telemetry';
import { formatMonthYear } from '../../lib/dateFormat';
import { breedingCopy } from '../../i18n/breeding';
import { shellCopy } from '../../i18n/shell';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { commonCopy } from '../../i18n/common';

/**
 * NOTE: The following components should be extracted into their own files
 * under `src/components/breeding/` to improve code organization and reusability.
 */
// The outcome label and the "awaiting vet" note are worded when shown, in the chosen language.
// Breeding logs carry no "last updated" time from the backend, so history is grouped and sorted
// by the AI date instead of a date made up on the phone.
function createHistoryEntry(log, status = 'Pending', notes = '') {
  return {
    ...log,
    status,
    notes,
    expectedCalvingDate: log.expectedCalvingDate ?? null,
  };
}

const outcomeLabel = (status) => breedingCopy.outcomes[status] ?? breedingCopy.outcomes.Pending;
const historyNotes = (entry) => entry.notes || (entry.status === 'Pending' ? breedingCopy.hub.awaitingVet : '');

function getStatusTone(status) {
  if (status === 'Pregnant') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'Open') return 'border-rose-500/30 bg-rose-500/10 text-rose-600';
  if (status === 'Failed') return 'border-red-700/25 bg-red-600/10 text-red-800';
  return 'border-brand/20 bg-brand/10 text-brand';
}

function formatSemenSource(source = 'farm_stock') {
  if (source === 'unknown') return breedingCopy.sources.unknown;
  return source === 'vet_provided' ? breedingCopy.sources.vet_provided : breedingCopy.sources.farm_stock;
}

function getSemenSourceTone(source = 'farm_stock') {
  if (source === 'unknown') {
    return 'border-ink/20 bg-surface-raised text-ink-muted';
  }
  return source === 'vet_provided'
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
    : 'border-sky-500/30 bg-sky-500/10 text-sky-700';
}

function formatCowLabel(log = {}) {
  return formatCowIdentity({ cowName: log.cowName, cowTag: log.cowTag });
}

function getMonthLabel(dateValue) {
  return formatMonthYear(dateValue, breedingCopy.hub.unknownMonth);
}

function groupHistoryByMonth(history) {
  return history.reduce((groups, entry) => {
    const monthLabel = getMonthLabel(entry.aiDate);

    if (!groups.has(monthLabel)) {
      groups.set(monthLabel, []);
    }

    groups.get(monthLabel).push(entry);
    return groups;
  }, new Map());
}

function HistoryStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-badge ${getStatusTone(status)}`}>
      {outcomeLabel(status)}
    </span>
  );
}

// ============================================================================
// COMPONENT 1: Page Header & KPI Chips (Responsibility: High-level context & Global Actions)
// ============================================================================
function BreedingHeader({ metrics, onLogService, onRecordHeat }) {
  const copy = breedingCopy.hub;
  return (
    <div className="flex flex-col gap-6 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="m-0 text-page-title text-brand mb-4">
          {/* The sidebar's label for this page: one key for both. */}
          {shellCopy.nav.items.breeding}
        </h1>

        {/* Compact KPI Chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-md bg-danger/10 px-3 py-1.5 text-meta text-danger border border-danger/20">
            {copy.onHeat(metrics.onHeat)}
          </div>
          <div className="flex items-center rounded-md bg-surface-raised px-3 py-1.5 text-meta text-ink-strong border border-ink/10">
            {copy.pendingChecks(metrics.pendingTotal, metrics.pendingDueNow)}
          </div>
          <div className="flex items-center rounded-md bg-brand/5 px-3 py-1.5 text-meta text-brand border border-brand/10">
            {copy.straws(metrics.totalStraws ?? '—')}
          </div>
        </div>
      </div>

      {/* Fixed Primary Action Button */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onRecordHeat} className="btn-secondary flex items-center text-control">

  {copy.recordHeat}
        </button>
        <button
          onClick={onLogService}
          className="btn-command flex items-center text-control bg-brand text-surface hover:bg-brand-dark transition-colors"
        >

  {copy.logService}
        </button>
      </div>
    </div>
  );
}

function SimpleModalSection({ title, children }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-ink/10 pb-3">
        <h3 className="text-section-title text-brand">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// COMPONENT 2: Heat Alerts (Responsibility: Urgent action routing)
// ============================================================================
function HeatAlerts({ alerts, onLogService }) {
  if (alerts.length === 0) return null;
  const copy = breedingCopy.hub;

  return (
    <div className="card-machined border-danger/20 bg-danger/5 p-6 ">
      <h2 className="mb-4 text-section-title text-danger">

  {copy.heatAlerts}
      </h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between rounded-lg bg-surface p-4  border border-danger/10">
            <div>
              <h3 className="text-section-title text-brand">{formatCowIdentity(alert)}</h3>
              <p className="text-meta text-danger mt-1">{copy.heatObserved(breedingCopy.intensities[alert.intensity] ?? alert.intensity)}</p>
              <p className="mt-1 text-meta text-ink-muted">{copy.nextWindow(alert.nextWindowStart, alert.nextWindowEnd)}</p>
            </div>
            <div className="text-right">
              <button type="button" onClick={() => onLogService(alert)} className="btn-command px-3 py-2 text-control">

  {copy.logAi}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 3: Vet Queue Item (Responsibility: Individual pregnancy check logic)
// ============================================================================
function VetQueueItem({ log, onOutcome, onEdit, isUpdating }) {
  const copy = breedingCopy.hub;
  const isReady = log.daysPostAI >= 45;

  return (
    <div className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors ${
      isReady ? 'border-brand/20 bg-surface' : 'border-ink/5 bg-surface/50 opacity-80'
    }`}>
      <div>
        <h3 className={`text-section-title ${isReady ? 'text-brand' : 'text-ink-strong'}`}>{formatCowLabel(log)}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted tabular-nums [&>span]:whitespace-nowrap">
          <span>{copy.served(log.aiDate || '--')}</span>
          <span aria-hidden="true">•</span>
          <span>{copy.bull(log.sireCode || '--')}</span>
          {log.expectedCalvingDate && (
            <>
              <span aria-hidden="true">•</span>
              <span>{copy.expectedCalving(log.expectedCalvingDate)}</span>
            </>
          )}
          {log.pregnancyCheckDate && (
            <>
              <span aria-hidden="true">•</span>
              <span>{copy.pregnancyCheck(log.pregnancyCheckDate)}</span>
            </>
          )}
          <span aria-hidden="true">•</span>
          <span className={`rounded-full border px-2 py-0.5 text-badge ${getSemenSourceTone(log.semenSource)}`}>
            {formatSemenSource(log.semenSource)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <div>
          <span className="block text-label text-ink-muted">{copy.daysSinceAi}</span>
          <span className={`text-body-strong ${isReady ? 'text-brand' : 'text-ink-muted'}`}>
            {log.daysPostAI}
          </span>
        </div>

        {isReady ? (
          <div className="flex gap-2">
            <button
              onClick={() => onOutcome(log.id, 'Open')}
              disabled={isUpdating}
              className="btn-danger gap-1 whitespace-nowrap px-3 py-2 text-control"
            >
              {isUpdating ? copy.saving : copy.markOpen}
            </button>
            <button
              onClick={() => onOutcome(log.id, 'Pregnant')}
              disabled={isUpdating}
              className="btn-command gap-1 whitespace-nowrap px-3 py-2 text-control"
            >
              {isUpdating ? copy.saving : copy.confirmPregnant}
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-ink/10 bg-surface-raised px-4 py-2 text-meta text-ink-muted">
            {copy.waitDays(45 - log.daysPostAI)}
          </div>
        )}
        <button
          type="button"
          onClick={() => onEdit(log)}
          className="btn-secondary ml-auto inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 text-control"
          aria-label={copy.editFor(formatCowLabel(log))}
        >

  {copy.edit}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 4: Inventory Panel (Responsibility: Semen stock & Reorder logic)
// ============================================================================
function SemenInventory({ stock, loadState, error, onRetry, onAddInventory, onRestockInventory, onDeleteInventory }) {
  const copy = breedingCopy.inventory;
  return (
    <div className="card-machined bg-surface p-6 h-full border border-ink/5 ">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-section-title text-brand">

  {copy.title}
        </h2>
      </div>

      <div className="space-y-3">
        {loadState !== 'ready' && (
          <div className="overflow-hidden rounded-lg border border-ink/10">
            <ListLoadNotices state={loadState} label={copy.listLabel} error={error} onRetry={onRetry} />
            {loadState === 'loading' && <div aria-busy="true"><CardSkeletons rows={2} /></div>}
          </div>
        )}
        {hasRowsToShow(loadState) && stock.length === 0 && (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-ink/10 bg-surface-raised p-4 text-body text-ink-muted">
            <p>{copy.empty}</p>
            <button type="button" onClick={onAddInventory} className="btn-command">{copy.add}</button>
          </div>
        )}

        {stock.map((bull) => {
          const isLowStock = bull.strawsLeft <= 2;
          return (
            <div key={bull.id} className={`rounded-lg border p-4 ${isLowStock ? 'border-orange-500/30 bg-orange-500/5' : 'border-ink/5 bg-surface-raised'}`}>
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-section-title text-ink-strong">{bull.name}</h3>
                <span className={`inline-block rounded px-2 py-0.5 text-meta ${isLowStock ? 'bg-orange-500/20 text-orange-700' : 'bg-brand/10 text-brand'}`}>
                  {copy.left(bull.strawsLeft)} {isLowStock && copy.reorder}
                </span>
              </div>
              <div className="mb-3 text-meta text-ink-muted tabular-nums">{copy.code(bull.code)}</div>

              <div className="text-meta text-ink-strong">

  {copy.bestFor(bull.improves)}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRestockInventory(bull)}
                  className="rounded-md border border-brand/20 bg-brand/5 px-3 py-1.5 text-control text-brand transition-colors hover:bg-brand/10"
                >
                  {copy.restock}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteInventory(bull)}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-control text-rose-700 transition-colors hover:bg-rose-100"
                >

  {copy.delete}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAddInventory} className="mt-6 flex w-full items-center justify-center rounded-lg border-2 border-dashed border-ink/10 bg-surface-raised py-3 text-control text-ink-muted transition-colors hover:border-brand/30 hover:text-brand">

  {copy.addNew}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN ORCHESTRATOR COMPONENT
// ============================================================================
export default function BreedingHub() {
  // Inputs are 16px on phones, so the long search hint would be cut off there.
  const isPhone = useMediaQuery(PHONE_QUERY);
  const copy = breedingCopy.hub;
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [, setShowError] = useState(false);

  // Mirror to the global Toaster so feedback renders above any open modal.
  const notifyInfo = (msg) => { setInfoMessage(msg); toast.success(msg); };
  const notifyError = (msg) => { setErrorMessage(msg); setShowError(true); toast.error(msg); };

  // Modal visibility states
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
  const [selectedBreedingLog, setSelectedBreedingLog] = useState(null);
  const [isHeatObservationOpen, setIsHeatObservationOpen] = useState(false);
  const [selectedHeatObservation, setSelectedHeatObservation] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  // Breeding history filter states
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [historyControlsOpen, setHistoryControlsOpen] = useState(false);

  // Form saving state
  const [isSaving, setIsSaving] = useState(false);
  const [statusUpdatingById, setStatusUpdatingById] = useState({});

  const confirmation = useConfirmation();

  // Same query (and cache) as the Cow Register. A failure leaves cow names unresolved rather
  // than pretending the herd is empty.
  const { data: herdData = [] } = useQuery({
    queryKey: ['herd', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: !!tenantId && !!farmId,
  });

  const herdOptions = useMemo(() => {
    const seen = new Set();

    return (Array.isArray(herdData) ? herdData : [])
      .map(normalizeHerdOption)
      .filter((option) => {
        if (!option.id) return false;
        const dedupeKey = `${option.id}|${option.name}`.toLowerCase();
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      });
  }, [herdData]);

  // The tank's contents as the backend has them; every change refetches this.
  const semenInventoryKey = ['breeding', 'semen-inventory', tenantId, farmId];
  const semenQuery = useQuery({
    queryKey: semenInventoryKey,
    queryFn: () => breedingApi.listSemenInventory(),
    enabled: !!tenantId && !!farmId,
  });
  const semenLoadState = getListLoadState(semenQuery);
  const inventory = useMemo(
    () => (Array.isArray(semenQuery.data) ? semenQuery.data.map(normalizeSemenInventory) : []),
    [semenQuery.data],
  );
  const refreshSemenInventory = () => queryClient.invalidateQueries({ queryKey: semenInventoryKey });

  const {
    data: geneticProgressData,
    error: geneticProgressError,
    refetch: refetchGeneticProgress,
    status: geneticProgressStatus,
    fetchStatus: geneticProgressFetchStatus,
  } = useQuery({
    queryKey: ['herd', 'genetic-progress', tenantId, farmId],
    queryFn: () => herdApi.geneticProgress(),
    enabled: !!tenantId && !!farmId,
  });
  const geneticProgressLoadState = getListLoadState({
    status: geneticProgressStatus,
    fetchStatus: geneticProgressFetchStatus,
    data: geneticProgressData,
  });

  // Saved on this phone by the app's query cache for offline use; there is no separate copy.
  const breedingLogsQuery = useQuery({
    queryKey: ['breeding', 'logs', tenantId, farmId],
    queryFn: () => breedingApi.listLogs(),
    enabled: !!tenantId && !!farmId,
  });
  const breedingLogsData = breedingLogsQuery.data;
  const logsLoadState = getListLoadState(breedingLogsQuery);

  const { data: heatObservations = [] } = useQuery({
    queryKey: ['breeding', 'heat-observations', tenantId, farmId],
    queryFn: () => breedingApi.listHeatObservations(),
    enabled: !!tenantId && !!farmId,
  });

  const normalizedBreedingLogs = useMemo(() => {
    if (!Array.isArray(breedingLogsData)) return null;

    return breedingLogsData
      .map(normalizeBreedingLog)
      .map((log) => enrichBreedingLogCowIdentity(log, herdOptions));
  }, [breedingLogsData, herdOptions]);

  const vetHistory = useMemo(
    () => (normalizedBreedingLogs ?? []).map((log) => createHistoryEntry(log, log.status, log.notes)),
    [normalizedBreedingLogs],
  );
  const vetQueue = useMemo(
    () => (normalizedBreedingLogs ?? []).filter((log) => log.status === 'Pending'),
    [normalizedBreedingLogs],
  );

  const breedingAlerts = useMemo(() => heatObservations
    .filter((observation) => !observation.breeding_log_id)
        .map((observation) => {
          const identity = resolveCowIdentityFromHerd({
            cowId: observation.cow_id,
            cowTag: observation.cow_tag,
            cowName: observation.cow_name,
          }, herdOptions);

          return {
            id: observation.id,
            cowId: String(observation.cow_id),
            cowName: identity.name,
            cowTag: identity.earTag,
            observedAt: observation.observed_at,
            intensity: observation.intensity,
            nextWindowStart: observation.next_window_start,
            nextWindowEnd: observation.next_window_end,
          };
        }), [heatObservations, herdOptions]);

  // Derived State for KPI Chips
  const metrics = {
    onHeat: breedingAlerts.length,
    pendingDueNow: vetQueue.filter((log) => log.daysPostAI >= 45).length,
    pendingTotal: vetQueue.length,
    // TODO(BR-009): the backend should return the tank total; until then it is summed here,
    // and shown as "—" while the inventory is unknown.
    totalStraws: hasRowsToShow(semenLoadState) ? inventory.reduce((total, bull) => total + bull.strawsLeft, 0) : null,
  };

  const handleOutcome = async (logId, outcome) => {
    if (statusUpdatingById[logId]) return;

    // 'Open' (not pregnant) is saved as the backend's 'Failed' status.
    const backendStatus = outcome === 'Pregnant' ? 'Pregnant' : 'Failed';
    setStatusUpdatingById((current) => ({ ...current, [logId]: true }));

    try {
      await breedingApi.updateLogStatus(logId, backendStatus);
      notifyInfo(copy.marked(outcomeLabel(outcome)));
      await queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] });
    } catch (error) {
      reportError(error, { where: 'BreedingHub.updateLogStatus' });
      setErrorMessage(getApiErrorMessage(error, copy.outcomeFailed));
      setShowError(true);
    } finally {
      setStatusUpdatingById((current) => {
        const next = { ...current };
        delete next[logId];
        return next;
      });
    }
  };

  const handleLogService = (heatObservation = null) => {
    setSelectedBreedingLog(null);
    setSelectedHeatObservation(heatObservation);
    setIsLogServiceOpen(true);
  };

  const handleEditPendingLog = (log) => {
    setSelectedHeatObservation(null);
    setSelectedBreedingLog(log);
    setIsLogServiceOpen(true);
  };

  const handleLogServiceSuccess = async (_savedLog, message) => {
    setIsLogServiceOpen(false);
    setSelectedHeatObservation(null);
    setSelectedBreedingLog(null);
    queryClient.invalidateQueries({ queryKey: ['breeding', 'heat-observations', tenantId, farmId] });
    notifyInfo(message);
  };

  const handleHeatObservationSuccess = async (_observation, message) => {
    setIsHeatObservationOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['breeding', 'heat-observations', tenantId, farmId] });
    notifyInfo(message);
  };

  const handleAddInventorySuccess = (_nextInventory, message) => {
    refreshSemenInventory();
    setIsInventoryOpen(false);
    notifyInfo(message);
  };

  const handleOpenRestock = (inventoryItem) => {
    setSelectedInventoryItem(inventoryItem);
    setIsRestockOpen(true);
  };

  const handleRestockSuccess = (_updated, message) => {
    refreshSemenInventory();
    setIsRestockOpen(false);
    setSelectedInventoryItem(null);
    notifyInfo(message);
  };

  const filteredHistory = filterBreedingHistory(vetHistory, historyFilter, historySearch);
  const groupedHistory = groupHistoryByMonth(filteredHistory);
  const hasActiveHistoryFilters = historyFilter !== 'All' || historySearch.trim() !== '';
  const activeHistoryControlCount = [historySearch.trim(), historyFilter !== 'All'].filter(Boolean).length;

  const handleDeleteInventory = async (bull) => {
    if (!bull?.id) {
      setErrorMessage(copy.deleteNoId);
      setShowError(true);
      return;
    }

    const confirmed = await confirmation.confirm({
      title: copy.deleteTitle,
      message: copy.deleteMessage(bull.name, bull.code || copy.noCode),
      type: 'danger',
      confirmText: copy.deleteConfirm,
      cancelText: copy.cancel,
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);
      await breedingApi.deleteSemenInventory(bull.id);
      await refreshSemenInventory();

      notifyInfo(copy.deleted(bull.name));
    } catch (error) {
      reportError(error, { where: 'BreedingHub.deleteSemen' });
      notifyError(getApiErrorMessage(error, copy.deleteFailed));
    } finally {
      confirmation.setLoading(false);
      confirmation.close();
    }
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="error" title={copy.error} message={errorMessage} autoDismiss={4000} onDismiss={() => setShowError(false)} />
        </div>
      )}

      {infoMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="success" title={copy.success} message={infoMessage} autoDismiss={2400} onDismiss={() => setInfoMessage('')} />
        </div>
      )}

      <BreedingHeader metrics={metrics} onLogService={() => handleLogService()} onRecordHeat={() => setIsHeatObservationOpen(true)} />

      {/* Main Layout Grid: Action (Left) vs Resources (Right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* LEFT COLUMN: ACTION & TRACKING */}
        <div className="space-y-6 lg:col-span-2">

          <HeatAlerts alerts={breedingAlerts} onLogService={handleLogService} />

          <div className="card-machined bg-surface p-6 border border-ink/5 ">
            <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
              <h2 className="text-section-title text-brand">

  {copy.pendingTitle}
              </h2>
            </div>

            <div className="space-y-3">
              {logsLoadState !== 'ready' && (
                <div className="overflow-hidden rounded-lg border border-ink/10">
                  <ListLoadNotices state={logsLoadState} label={copy.logsLabel} error={breedingLogsQuery.error} onRetry={breedingLogsQuery.refetch} />
                  {logsLoadState === 'loading' && <div aria-busy="true"><CardSkeletons rows={2} /></div>}
                </div>
              )}
              {vetQueue.map((log) => (
                <VetQueueItem
                  key={log.id}
                  log={log}
                  onOutcome={handleOutcome}
                  onEdit={handleEditPendingLog}
                  isUpdating={!!statusUpdatingById[log.id]}
                />
              ))}
              {hasRowsToShow(logsLoadState) && vetQueue.length === 0 && (
                <div className="py-8 text-center text-body text-ink-muted">
                  {copy.allChecked}
                </div>
              )}
            </div>

            {/* Progressive Disclosure Scaffold */}
            <button onClick={() => setIsHistoryOpen(true)} className="mt-4 flex w-full items-center justify-center gap-1 py-2 text-control text-brand hover:underline">
              {copy.viewHistory} <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          {/* BOTTOM: TRENDS / ROI */}
          <div className="card-machined bg-surface-raised p-6 border border-brand/10">
            <h2 className="mb-6 text-section-title text-ink-muted">

  {copy.geneticTitle}
            </h2>

            {geneticProgressLoadState === 'loading' ? (
              <div aria-busy="true">
                <SlowLoadingHint label={copy.chartLabel} />
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : geneticProgressLoadState === 'error' || geneticProgressLoadState === 'offline' ? (
              <ListLoadMessage state={geneticProgressLoadState} label={copy.geneticChartLabel} error={geneticProgressError} onRetry={refetchGeneticProgress} />
            ) : geneticProgressData && geneticProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={geneticProgressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" label={{ value: copy.yieldAxis, angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#64748b' } }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="daughters_yield" name={copy.daughters} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="mothers_yield" name={copy.mothers} stroke="#38BDF8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center rounded-lg border border-dashed border-ink/10 bg-surface p-6 text-body text-ink-muted">
                {copy.noGeneticData}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: RESOURCES */}
        <div className="h-full">
            <SemenInventory
              stock={inventory}
              loadState={semenLoadState}
              error={semenQuery.error}
              onRetry={semenQuery.refetch}
              onAddInventory={() => setIsInventoryOpen(true)}
              onRestockInventory={handleOpenRestock}
              onDeleteInventory={handleDeleteInventory}
            />
        </div>

      </div>

      <BaseModal closeOnBackdrop
        isOpen={isLogServiceOpen}
        onClose={() => {
          setIsLogServiceOpen(false);
          setSelectedHeatObservation(null);
          setSelectedBreedingLog(null);
        }}
        title={selectedBreedingLog ? copy.editServiceTitle : copy.logService}
      >
        <LogAIServiceForm
          key={selectedBreedingLog?.id || selectedHeatObservation?.id || 'new-ai-service'}
          herdOptions={herdOptions}
          onSuccess={handleLogServiceSuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
          isSaving={isSaving}
          onSavingChange={setIsSaving}
          initialData={selectedBreedingLog ? {
            ...selectedBreedingLog,
            cowId: formatCowIdentity(selectedBreedingLog, selectedBreedingLog.cowId),
          } : selectedHeatObservation ? {
            cowId: selectedHeatObservation.cowId,
            aiDate: toLocalIsoDate(selectedHeatObservation.observedAt),
            heatObservationId: selectedHeatObservation.id,
          } : {}}
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setIsLogServiceOpen(false);
              setSelectedHeatObservation(null);
              setSelectedBreedingLog(null);
            }}
            className="btn-secondary px-4 py-2 text-control"
          >
            {copy.cancel}
          </button>
        </div>
      </BaseModal>

      <BaseModal closeOnBackdrop isOpen={isHeatObservationOpen} onClose={() => setIsHeatObservationOpen(false)} title={copy.heatTitle}>
        <LogHeatObservationForm
          herdOptions={herdOptions}
          onSuccess={handleHeatObservationSuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
        />
      </BaseModal>

      <BaseModal closeOnBackdrop isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title={copy.historyTitle}>
        <div className="space-y-4">
          <SimpleModalSection title={copy.allChecks}>
            <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-label text-ink-muted">

  {copy.searchAndFilters}
                </div>
                <p className="mt-1 text-body text-ink-muted">{copy.historyHint}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-badge text-ink-muted">
                  {copy.activeFilters(activeHistoryControlCount)}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryControlsOpen((current) => !current)}
                  aria-expanded={historyControlsOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-control text-ink transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
                >
                  {historyControlsOpen ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                  {historyControlsOpen ? copy.hideFilters : copy.showFilters}
                </button>
              </div>
            </div>

            {historyControlsOpen && (
              <div className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised px-3 py-2">
                    <Search size={14} className="text-ink-muted" aria-hidden="true" />
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      aria-label={copy.historySearch}
                      placeholder={isPhone ? commonCopy.filters.searchShort : copy.historySearch}
                      className="w-full bg-transparent text-control text-ink-strong outline-none placeholder:text-ink-muted"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('All');
                        setHistorySearch('');
                      }}
                      className={`rounded-lg border px-3 py-2 text-control transition-colors ${
                        hasActiveHistoryFilters
                          ? 'border-brand/20 bg-brand/5 text-brand hover:bg-brand/10'
                          : 'border-ink/10 bg-surface-raised text-ink-muted'
                      }`}
                    >
                      {copy.clearFilters}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'All', label: copy.all },
                    { value: 'Pregnant', label: breedingCopy.statuses.Pregnant },
                    { value: 'Open', label: breedingCopy.statuses.Open },
                    { value: 'Pending', label: breedingCopy.statuses.Pending },
                    { value: 'Failed', label: breedingCopy.statuses.Failed },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHistoryFilter(value)}
                      className={`rounded-full border px-3 py-1.5 text-control transition-colors ${
                        historyFilter === value
                          ? 'border-brand bg-brand text-surface'
                          : 'border-ink/10 bg-surface-raised text-ink-muted hover:border-brand/20 hover:text-brand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto pr-1">
              {filteredHistory.length === 0 && (
                <div className="rounded-lg border border-dashed border-ink/10 bg-surface/50 p-6 text-center text-body text-ink-muted">
                  {copy.noHistoryMatches}
                </div>
              )}

              {Array.from(groupedHistory.entries()).map(([monthLabel, entries]) => (
                <div key={monthLabel} className="mb-4 space-y-2 last:mb-0">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-ink/10 bg-surface px-3 py-2 text-label text-brand ">
                    <span>{monthLabel}</span>
                    <span className="rounded-full bg-brand/5 px-2 py-0.5 text-badge text-brand">
                      {copy.recordCount(entries.length)}
                    </span>
                  </div>

                  {/* Phones: one card per AI record, like the other lists. */}
                  <ul className="space-y-2 md:hidden">
                    {entries.map((entry) => (
                      <li key={entry.id} className="min-w-0 rounded-lg border border-ink/10 bg-surface-raised p-3">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-body-strong text-ink-strong">{formatCowLabel(entry)}</p>
                            {historyNotes(entry) && <p className="mt-1 break-words text-meta text-ink-muted">{historyNotes(entry)}</p>}
                          </div>
                          <HistoryStatusBadge status={entry.status} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink/10 pt-2 text-meta">
                          <div className="min-w-0"><dt className="text-ink-muted">{copy.columns.aiDate}</dt><dd className="text-ink">{entry.aiDate || '—'}</dd></div>
                          <div className="min-w-0"><dt className="text-ink-muted">{copy.columns.bull}</dt><dd className="break-words text-ink">{entry.sireCode || '—'}</dd></div>
                          <div className="min-w-0"><dt className="text-ink-muted">{copy.columns.expectedCalving}</dt><dd className="text-ink">{entry.expectedCalvingDate || '—'}</dd></div>
                          <div className="col-span-2 min-w-0">
                            <dt className="sr-only">{copy.columns.source}</dt>
                            <dd>
                              <span className={`inline-flex rounded-full border px-2 py-1 text-badge ${getSemenSourceTone(entry.semenSource)}`}>
                                {formatSemenSource(entry.semenSource)}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-hidden rounded-lg border border-ink/10 bg-surface-raised md:block">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-surface/70">
                        <tr>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.cow}</th>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.aiDate}</th>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.bull}</th>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.expectedCalving}</th>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.source}</th>
                          <th className="px-2 py-1.5 text-label text-ink-muted">{copy.columns.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-t border-ink/5 align-top hover:bg-surface/50">
                            <td className="px-2 py-2">
                              <div className="text-body-strong text-ink-strong">{formatCowLabel(entry)}</div>
                              {historyNotes(entry) && <div className="mt-1 text-meta text-ink-muted">{historyNotes(entry)}</div>}
                            </td>
                            <td className="px-2 py-2 text-body text-ink-muted">{entry.aiDate || '—'}</td>
                            <td className="px-2 py-2 text-body text-ink-muted">{entry.sireCode || '—'}</td>
                            <td className="px-2 py-2 text-body text-ink-muted">{entry.expectedCalvingDate || '—'}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex rounded-full border px-2 py-1 text-badge ${getSemenSourceTone(entry.semenSource)}`}>
                                {formatSemenSource(entry.semenSource)}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <HistoryStatusBadge status={entry.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </SimpleModalSection>
          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setIsHistoryOpen(false)} className="btn-command px-4 py-2 text-control">{copy.close}</button>
          </div>
        </div>
      </BaseModal>

      <BaseModal closeOnBackdrop isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} title={copy.addInventoryTitle}>
        <ManageSemenInventoryForm
          onSuccess={handleAddInventorySuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
          isSaving={isSaving}
          onSavingChange={setIsSaving}
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsInventoryOpen(false)}
            className="btn-secondary px-4 py-2 text-control"
          >
            {copy.cancel}
          </button>
        </div>
      </BaseModal>

      <BaseModal closeOnBackdrop
        isOpen={isRestockOpen}
        onClose={() => {
          setIsRestockOpen(false);
          setSelectedInventoryItem(null);
        }}
        title={copy.restockTitle}
      >
        <RestockSemenInventoryForm
          inventoryItem={selectedInventoryItem}
          onSuccess={handleRestockSuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
          isSaving={isSaving}
          onSavingChange={setIsSaving}
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setIsRestockOpen(false);
              setSelectedInventoryItem(null);
            }}
            className="btn-secondary px-4 py-2 text-control"
          >
            {copy.cancel}
          </button>
        </div>
      </BaseModal>

      <Confirmation {...confirmation} />
    </div>
  );
}
