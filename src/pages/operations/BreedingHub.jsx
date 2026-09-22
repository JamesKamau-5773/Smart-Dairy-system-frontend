import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import {
  LogAIServiceForm,
  LogHeatObservationForm,
  ManageSemenInventoryForm,
  RestockSemenInventoryForm,
} from '../../components/forms/breeding';
import {
  enrichBreedingLogCowIdentity,
  normalizeBreedingLog,
  normalizeHerdOption,
  normalizeSemenInventory,
} from '../../lib/breedingUtils';
import { createAuditEntry, logToAuditTrail } from '../../lib/audit';
import { breedingApi, herdApi } from '../../lib/backendApi';
import { formatCowIdentity, resolveCowIdentityFromHerd } from '../../lib/cowIdentity';
import { useTenant } from '../../hooks/useTenant';
import {
  Dna,
  TrendingUp,
  Syringe,
  CheckCircle2,
  Stethoscope,
  XCircle,
  Flame,
  Snowflake,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';

const bullStock = [];
const initialVetQueue = [];
const INITIAL_HISTORY = [];

function getBreedingCacheKey(tenantId, farmId) {
  return `breeding_logs_cache:${tenantId || 'tenant'}:${farmId || 'farm'}`;
}

function readCachedBreedingLogs(tenantId, farmId) {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getBreedingCacheKey(tenantId, farmId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedBreedingLogs(tenantId, farmId, logs) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getBreedingCacheKey(tenantId, farmId), JSON.stringify(Array.isArray(logs) ? logs : []));
  } catch {
    // Ignore quota or storage errors and keep UI flow unaffected.
  }
}

function removeBreedingCacheLog(tenantId, farmId, logId) {
  const current = readCachedBreedingLogs(tenantId, farmId);
  const next = current.filter((item) => item.id !== logId);
  writeCachedBreedingLogs(tenantId, farmId, next);
}

function mergeBreedingLogs(serverLogs = [], cachedLogs = []) {
  const merged = new Map();

  [...cachedLogs, ...serverLogs].forEach((entry) => {
    const key = `${entry.id ?? ''}|${entry.cowId ?? ''}|${entry.aiDate ?? ''}|${entry.sireCode ?? ''}`;
    if (!merged.has(key)) {
      merged.set(key, entry);
    } else {
      merged.set(key, { ...merged.get(key), ...entry });
    }
  });

  return Array.from(merged.values());
}

/**
 * NOTE: The following components should be extracted into their own files
 * under `src/components/breeding/` to improve code organization and reusability.
 */
function createHistoryEntry(log, status = 'Pending', notes = '') {
  const labelByStatus = {
    Pregnant: 'Pregnant (In-Calf)',
    Open: 'Open (Not Pregnant)',
    Pending: 'Pending Check',
  };

  return {
    ...log,
    status,
    outcome: labelByStatus[status] || 'Pending Check',
    notes: notes || (status === 'Pending' ? 'Awaiting vet window' : ''),
    expectedCalvingDate: log.expectedCalvingDate ?? null,
    updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  };
}

function getStatusTone(status) {
  if (status === 'Pregnant') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'Open') return 'border-rose-500/30 bg-rose-500/10 text-rose-600';
  return 'border-brand/20 bg-brand/10 text-brand';
}

function formatSemenSource(source = 'farm_stock') {
  if (source === 'unknown') return 'Unknown Source';
  return source === 'vet_provided' ? 'Vet Provided' : 'Farm Stock';
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
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Unknown Month';

  return parsedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getFilteredHistory(history, filter, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return history
    .filter((entry) => filter === 'All' || entry.status === filter)
    .filter((entry) => {
      if (!normalizedSearch) return true;
      return [entry.cowName, entry.cowTag, entry.cowId]
        .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    })
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function groupHistoryByMonth(history) {
  return history.reduce((groups, entry) => {
    const monthLabel = getMonthLabel(entry.updatedAt);

    if (!groups.has(monthLabel)) {
      groups.set(monthLabel, []);
    }

    groups.get(monthLabel).push(entry);
    return groups;
  }, new Map());
}

function HistoryStatusBadge({ status, outcome }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusTone(status)}`}>
      {outcome}
    </span>
  );
}

// ============================================================================
// COMPONENT 1: Page Header & KPI Chips (Responsibility: High-level context & Global Actions)
// ============================================================================
function BreedingHeader({ metrics, onLogService, onRecordHeat }) {
  return (
    <div className="flex flex-col gap-6 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
          <Dna size={12} /> Herd Reproduction
        </div>
        <h2 className="m-0 font-sans text-3xl font-bold tracking-tight text-brand mb-4">
          AI & <span className="text-ink-muted">Pregnancy</span>
        </h2>

        {/* Compact KPI Chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger border border-danger/20">
            <Flame size={14} /> {metrics.onHeat} On Heat
          </div>
          <div className="flex items-center gap-2 rounded-md bg-surface-raised px-3 py-1.5 text-xs font-bold text-ink-strong border border-ink/10">
            <Stethoscope size={14} /> {metrics.pendingTotal} Pending Checks ({metrics.pendingDueNow} Due)
          </div>
          <div className="flex items-center gap-2 rounded-md bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand border border-brand/10">
            <Snowflake size={14} /> {metrics.totalStraws} Straws in Tank
          </div>
        </div>
      </div>

      {/* Fixed Primary Action Button */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onRecordHeat} className="btn-secondary flex items-center gap-2 text-sm">
          <Flame size={16} /> Record Heat
        </button>
        <button
          onClick={onLogService}
          className="btn-command flex items-center gap-2 text-sm bg-brand text-surface  hover:bg-brand-dark transition-colors"
        >
          <Syringe size={16} /> Log AI Service
        </button>
      </div>
    </div>
  );
}

function SimpleModalSection({ title, children }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-ink/10 pb-3">
        <h4 className="text-sm font-bold uppercase tracking-widest text-brand">{title}</h4>
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

  return (
    <div className="card-machined border-danger/20 bg-danger/5 p-6 ">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-danger">
        <Flame size={18} /> Action Needed: Cows in Heat
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between rounded-lg bg-surface p-4  border border-danger/10">
            <div>
              <h4 className="font-black text-brand text-lg">{formatCowIdentity(alert)}</h4>
              <p className="text-xs font-bold text-danger mt-1">{alert.intensity} heat observed</p>
              <p className="mt-1 text-xs text-ink-muted">Next watch window: {alert.nextWindowStart} to {alert.nextWindowEnd}</p>
            </div>
            <div className="text-right">
              <button type="button" onClick={() => onLogService(alert)} className="btn-command px-3 py-2 text-xs">
                <Syringe size={14} /> Log AI
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
function VetQueueItem({ log, onOutcome, isUpdating }) {
  const isReady = log.daysPostAI >= 45;

  return (
    <div className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors md:flex-row md:items-center md:justify-between ${
      isReady ? 'border-brand/20 bg-surface' : 'border-ink/5 bg-surface/50 opacity-80'
    }`}>
      <div>
        <h4 className={`font-bold text-base ${isReady ? 'text-brand' : 'text-ink-strong'}`}>{formatCowLabel(log)}</h4>
        <div className="mt-1 flex gap-3 font-mono text-xs text-ink-muted">
          <span>Served: {log.aiDate || '--'}</span>
          <span aria-hidden="true">•</span>
          <span>Bull: {log.sireCode || '--'}</span>
          {log.expectedCalvingDate && (
            <>
              <span aria-hidden="true">•</span>
              <span>Expected Calving: {log.expectedCalvingDate}</span>
            </>
          )}
          {log.pregnancyCheckDate && (
            <>
              <span aria-hidden="true">•</span>
              <span>Pregnancy Check: {log.pregnancyCheckDate}</span>
            </>
          )}
          <span aria-hidden="true">•</span>
          <span className={`rounded-full border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${getSemenSourceTone(log.semenSource)}`}>
            {formatSemenSource(log.semenSource)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">Days Since AI</span>
          <span className={`text-lg font-black ${isReady ? 'text-brand' : 'text-ink-muted'}`}>
            {log.daysPostAI}
          </span>
        </div>

        {isReady ? (
          <div className="flex gap-2">
            <button
              onClick={() => onOutcome(log.id, 'Open (Not Pregnant)')}
              disabled={isUpdating}
              className="btn-danger gap-1 px-3 py-2 text-xs"
            >
              <XCircle size={14} /> {isUpdating ? 'Saving...' : 'Mark Open'}
            </button>
            <button
              onClick={() => onOutcome(log.id, 'Pregnant')}
              disabled={isUpdating}
              className="btn-command gap-1 px-3 py-2 text-xs"
            >
              <CheckCircle2 size={14} /> {isUpdating ? 'Saving...' : 'Confirm Pregnant'}
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-ink/10 bg-surface-raised px-4 py-2 text-xs font-bold text-ink-muted">
            Wait {45 - log.daysPostAI} Days
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 4: Inventory Panel (Responsibility: Semen stock & Reorder logic)
// ============================================================================
function SemenInventory({ stock, onAddInventory, onRestockInventory, onDeleteInventory }) {
  return (
    <div className="card-machined bg-surface p-6 h-full border border-ink/5 ">
      <div className="flex items-center justify-between mb-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand">
          <Snowflake size={18} className="text-accent" /> Semen Inventory
        </h3>
      </div>

      <div className="space-y-3">
        {stock.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink/10 bg-surface-raised p-4 text-sm text-ink-muted">
            No semen inventory records yet.
          </div>
        )}

        {stock.map((bull) => {
          const isLowStock = bull.strawsLeft <= 2;
          return (
            <div key={bull.id} className={`rounded-lg border p-4 ${isLowStock ? 'border-orange-500/30 bg-orange-500/5' : 'border-ink/5 bg-surface-raised'}`}>
              <div className="mb-1 flex items-start justify-between">
                <h4 className="text-sm font-bold text-ink-strong">{bull.name}</h4>
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${isLowStock ? 'bg-orange-500/20 text-orange-700' : 'bg-brand/10 text-brand'}`}>
                  {bull.strawsLeft} left {isLowStock && '- Reorder'}
                </span>
              </div>
              <div className="mb-3 font-mono text-[10px] text-ink-muted">CODE: {bull.code}</div>

              <div className="flex items-center gap-2 text-xs font-semibold text-ink-strong">
                <TrendingUp size={14} className="text-accent" /> Best for: {bull.improves}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRestockInventory(bull)}
                  className="rounded-md border border-brand/20 bg-brand/5 px-3 py-1.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand/10"
                >
                  Restock
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteInventory(bull)}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAddInventory} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/10 bg-surface-raised py-3 text-xs font-bold text-ink-muted transition-colors hover:border-brand/30 hover:text-brand">
        <Plus size={14} /> Add New Inventory
      </button>
    </div>
  );
}

// ============================================================================
// MAIN ORCHESTRATOR COMPONENT
// ============================================================================
export default function BreedingHub() {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [vetQueue, setVetQueue] = useState(initialVetQueue);
  const [vetHistory, setVetHistory] = useState(INITIAL_HISTORY);
  const [inventory, setInventory] = useState(bullStock);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [, setShowError] = useState(false);

  // Mirror to the global Toaster so feedback renders above any open modal.
  const notifyInfo = (msg) => { setInfoMessage(msg); toast.success(msg); };
  const notifyError = (msg) => { setErrorMessage(msg); setShowError(true); toast.error(msg); };

  // Modal visibility states
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
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

  const { data: herdData = [] } = useQuery({
    queryKey: ['herd', tenantId, farmId],
    queryFn: async () => {
      try {
        return await herdApi.list();
      } catch (error) {
        console.error('Failed to load herd list:', error);
        return [];
      }
    },
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

  const { data: semenInventoryData } = useQuery({
    queryKey: ['breeding', 'semen-inventory', tenantId, farmId],
    queryFn: async () => {
      try {
        return await breedingApi.listSemenInventory();
      } catch (error) {
        console.error('Failed to load semen inventory:', error);
        return [];
      }
    },
    enabled: !!tenantId && !!farmId,
  });

  const { data: geneticProgressData, isLoading: isLoadingGeneticProgress } = useQuery({
    queryKey: ['herd', 'genetic-progress', tenantId, farmId],
    queryFn: async () => {
      try {
        return await herdApi.geneticProgress();
      } catch (error) {
        console.error('Failed to load genetic progress data:', error);
        return [];
      }
    },
    enabled: !!tenantId && !!farmId,
  });

  const { data: breedingLogsData } = useQuery({
    queryKey: ['breeding', 'logs', tenantId, farmId],
    queryFn: async () => {
      try {
        return await breedingApi.listLogs();
      } catch (error) {
        console.error('Failed to load breeding logs:', error);
        return [];
      }
    },
    enabled: !!tenantId && !!farmId,
  });

  const { data: heatObservations = [] } = useQuery({
    queryKey: ['breeding', 'heat-observations', tenantId, farmId],
    queryFn: () => breedingApi.listHeatObservations(),
    enabled: !!tenantId && !!farmId,
  });

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

  useEffect(() => {
    if (Array.isArray(semenInventoryData) && inventory.length === 0) {
      setInventory(semenInventoryData.map(normalizeSemenInventory));
    }
  }, [inventory.length, semenInventoryData]);

  useEffect(() => {
    if (Array.isArray(breedingLogsData)) {
      const normalizedServer = breedingLogsData.map(normalizeBreedingLog);
      const normalizedCached = readCachedBreedingLogs(tenantId, farmId).map(normalizeBreedingLog);
      const normalized = mergeBreedingLogs(normalizedServer, normalizedCached)
        .map((log) => enrichBreedingLogCowIdentity(log, herdOptions));

      writeCachedBreedingLogs(tenantId, farmId, normalized);
      setVetHistory(normalized.map((log) => createHistoryEntry(log, log.status, log.notes)));
      setVetQueue(normalized.filter((log) => log.status === 'Pending'));
    }
  }, [breedingLogsData, herdOptions, tenantId, farmId]);

  // Derived State for KPI Chips
  const metrics = {
    onHeat: breedingAlerts.length,
    pendingDueNow: vetQueue.filter((log) => log.daysPostAI >= 45).length,
    pendingTotal: vetQueue.length,
    totalStraws: inventory.reduce((total, bull) => total + bull.strawsLeft, 0)
  };

  const handleOutcome = async (logId, outcome) => {
    if (statusUpdatingById[logId]) return;

    const backendStatus = outcome === 'Pregnant' ? 'Pregnant' : 'Failed';
    const displayStatus = outcome === 'Pregnant' ? 'Pregnant' : 'Open';
    setStatusUpdatingById((current) => ({ ...current, [logId]: true }));

    try {
      await breedingApi.updateLogStatus(logId, backendStatus);
      notifyInfo(`Cow marked as ${outcome}. Records updated.`);
      removeBreedingCacheLog(tenantId, farmId, logId);
      setVetQueue((current) => current.filter((log) => log.id !== logId));
      setVetHistory((current) =>
        current.map((entry) => {
          if (entry.id !== logId) return entry;

          return {
            ...entry,
            status: displayStatus,
            outcome: displayStatus === 'Pregnant' ? 'Pregnant (In-Calf)' : 'Open (Not Pregnant)',
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          };
        })
      );

      // Same reasoning as handleAddHistoryEntry: keep other consumers of this key in sync.
      await queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] });
    } catch (error) {
      console.error('Failed to update breeding log status:', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to confirm vet outcome. Please retry.');
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
    setSelectedHeatObservation(heatObservation);
    setIsLogServiceOpen(true);
  };

  const handleLogServiceSuccess = (savedLog, message) => {
    setVetQueue((current) => [...current, savedLog]);
    const entry = createHistoryEntry(savedLog, 'Pending', '');
    setVetHistory((current) => [entry, ...current]);
    setIsLogServiceOpen(false);
    setSelectedHeatObservation(null);
    queryClient.invalidateQueries({ queryKey: ['breeding', 'heat-observations', tenantId, farmId] });
    notifyInfo(message);
  };

  const handleHeatObservationSuccess = async (_observation, message) => {
    setIsHeatObservationOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['breeding', 'heat-observations', tenantId, farmId] });
    notifyInfo(message);
  };

  const handleAddInventorySuccess = (nextInventory, message) => {
    setInventory((current) => [nextInventory, ...current]);
    setIsInventoryOpen(false);
    notifyInfo(message);
  };

  const handleOpenRestock = (inventoryItem) => {
    setSelectedInventoryItem(inventoryItem);
    setIsRestockOpen(true);
  };

  const handleRestockSuccess = (updated, message) => {
    setInventory((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setIsRestockOpen(false);
    setSelectedInventoryItem(null);
    notifyInfo(message);
  };

  const filteredHistory = getFilteredHistory(vetHistory, historyFilter, historySearch);
  const groupedHistory = groupHistoryByMonth(filteredHistory);
  const hasActiveHistoryFilters = historyFilter !== 'All' || historySearch.trim() !== '';
  const activeHistoryControlCount = [historySearch.trim(), historyFilter !== 'All'].filter(Boolean).length;

  const handleDeleteInventory = async (bull) => {
    if (!bull?.id) {
      setErrorMessage('This semen inventory item cannot be deleted because it has no identifier.');
      setShowError(true);
      return;
    }

    const confirmed = await confirmation.confirm({
      title: 'Delete semen inventory?',
      message: `Remove ${bull.name} (${bull.code || 'NO-CODE'}) from inventory? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);
      await breedingApi.deleteSemenInventory(bull.id);
      setInventory((current) => current.filter((item) => item.id !== bull.id));

      logToAuditTrail(
        createAuditEntry({
          action: 'delete',
          recordType: 'semen_inventory',
          recordId: bull.id,
          userName: 'You',
          notes: `Deleted ${bull.name} (${bull.code || 'NO-CODE'}) from semen inventory`,
        })
      );

      notifyInfo(`Deleted ${bull.name} from semen inventory.`);
    } catch (error) {
      console.error('Error deleting inventory:', error);
      notifyError(error?.response?.data?.error || 'Failed to delete semen inventory. Please try again.');
    } finally {
      confirmation.setLoading(false);
      confirmation.close();
    }
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="error" title="Error" message={errorMessage} autoDismiss={4000} onDismiss={() => setShowError(false)} />
        </div>
      )}

      {infoMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="success" title="Success" message={infoMessage} autoDismiss={2400} onDismiss={() => setInfoMessage('')} />
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
              <h3 className="flex items-center gap-2 text-base font-bold text-brand">
                <Stethoscope size={18} className="text-brand-dark" /> Pending Vet Checks
              </h3>
            </div>

            <div className="space-y-3">
              {vetQueue.map((log) => (
                <VetQueueItem key={log.id} log={log} onOutcome={handleOutcome} isUpdating={!!statusUpdatingById[log.id]} />
              ))}
              {vetQueue.length === 0 && (
                <div className="py-8 text-center text-sm font-medium text-ink-muted">
                  All inseminated cows have been checked by the vet.
                </div>
              )}
            </div>

            {/* Progressive Disclosure Scaffold */}
            <button onClick={() => setIsHistoryOpen(true)} className="mt-4 flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-brand hover:underline">
              View All Historical Checks <ChevronRight size={14} />
            </button>
          </div>

          {/* BOTTOM: TRENDS / ROI */}
          <div className="card-machined bg-surface-raised p-6 border border-brand/10">
            <h3 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
              <TrendingUp size={16} className="text-accent" /> Herd Genetic Progress
            </h3>

            {isLoadingGeneticProgress ? (
              <div className="h-[300px] flex items-center justify-center text-ink-muted">Loading chart data...</div>
            ) : geneticProgressData && geneticProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={geneticProgressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} label={{ value: 'Avg. Yield (L/day)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#64748b' } }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="daughters_yield" name="Daughters' Avg Yield" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="mothers_yield" name="Mothers' Avg Yield" stroke="#38BDF8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center rounded-lg border border-dashed border-ink/10 bg-surface p-6 text-sm text-ink-muted">
                Not enough data to plot genetic progress chart.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: RESOURCES */}
        <div className="h-full">
            <SemenInventory
              stock={inventory}
              onAddInventory={() => setIsInventoryOpen(true)}
              onRestockInventory={handleOpenRestock}
              onDeleteInventory={handleDeleteInventory}
            />
        </div>

      </div>

      <Modal isOpen={isLogServiceOpen} onClose={() => { setIsLogServiceOpen(false); setSelectedHeatObservation(null); }} title="Log AI Service">
        <LogAIServiceForm
          key={selectedHeatObservation?.id || 'unlinked-ai'}
          herdOptions={herdOptions}
          onSuccess={handleLogServiceSuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
          isSaving={isSaving}
          onSavingChange={setIsSaving}
          initialData={selectedHeatObservation ? {
            cowId: selectedHeatObservation.cowId,
            aiDate: new Date(selectedHeatObservation.observedAt).toISOString().slice(0, 10),
            heatObservationId: selectedHeatObservation.id,
          } : {}}
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsLogServiceOpen(false)}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal isOpen={isHeatObservationOpen} onClose={() => setIsHeatObservationOpen(false)} title="Record Heat Observation">
        <LogHeatObservationForm
          herdOptions={herdOptions}
          onSuccess={handleHeatObservationSuccess}
          onError={(msg) => { setErrorMessage(msg); setShowError(true); }}
        />
      </Modal>

      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Historical Checks">
        <div className="space-y-4">
          <SimpleModalSection title="All Checks">
            <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  <Search size={12} /> Search and filters
                </div>
                <p className="mt-1 text-sm leading-6 text-ink-muted">Filter breeding history by record status, cow name, or ear tag.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  {activeHistoryControlCount} active
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryControlsOpen((current) => !current)}
                  aria-expanded={historyControlsOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink  transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
                >
                  {historyControlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {historyControlsOpen ? 'Hide filters' : 'Show filters'}
                </button>
              </div>
            </div>

            {historyControlsOpen && (
              <div className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised px-3 py-2">
                    <Search size={14} className="text-ink-muted" />
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder="Search name or ear tag..."
                      className="w-full bg-transparent text-sm text-ink-strong outline-none placeholder:text-ink-muted"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('All');
                        setHistorySearch('');
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                        hasActiveHistoryFilters
                          ? 'border-brand/20 bg-brand/5 text-brand hover:bg-brand/10'
                          : 'border-ink/10 bg-surface-raised text-ink-muted'
                      }`}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['All', 'Pregnant', 'Open', 'Pending'].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setHistoryFilter(filter)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                        historyFilter === filter
                          ? 'border-brand bg-brand text-surface'
                          : 'border-ink/10 bg-surface-raised text-ink-muted hover:border-brand/20 hover:text-brand'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto pr-1">
              {filteredHistory.length === 0 && (
                <div className="rounded-lg border border-dashed border-ink/10 bg-surface/50 p-6 text-center text-sm text-ink-muted">
                  No records match the selected filter.
                </div>
              )}

              {Array.from(groupedHistory.entries()).map(([monthLabel, entries]) => (
                <div key={monthLabel} className="mb-4 space-y-2 last:mb-0">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-ink/10 bg-surface px-3 py-2 text-xs font-black uppercase tracking-widest text-brand ">
                    <span>{monthLabel}</span>
                    <span className="rounded-full bg-brand/5 px-2 py-0.5 text-[10px] font-black text-brand">
                      {entries.length} {entries.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-ink/10 bg-surface-raised">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-surface/70">
                        <tr>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Cow</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">AI Date</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Bull</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Expected Calving</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Source</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Status</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-t border-ink/5 align-top hover:bg-surface/50">
                            <td className="px-2 py-2">
                              <div className="font-bold text-ink-strong">{formatCowLabel(entry)}</div>
                              {entry.notes && <div className="mt-1 text-[11px] text-ink-muted">{entry.notes}</div>}
                            </td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.aiDate || '--'}</td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.sireCode || '--'}</td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.expectedCalvingDate || '--'}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getSemenSourceTone(entry.semenSource)}`}>
                                {formatSemenSource(entry.semenSource)}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <HistoryStatusBadge status={entry.status} outcome={entry.outcome} />
                            </td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.updatedAt}</td>
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
            <button type="button" onClick={() => setIsHistoryOpen(false)} className="btn-command px-4 py-2 text-sm">Close</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} title="Add New Inventory">
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
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isRestockOpen}
        onClose={() => {
          setIsRestockOpen(false);
          setSelectedInventoryItem(null);
        }}
        title="Restock Semen Inventory"
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
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Confirmation
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        isLoading={confirmation.isLoading}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </div>
  );
}
