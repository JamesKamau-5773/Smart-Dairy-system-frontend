import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';
import { breedingApi, herdApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import {
  Dna,
  CalendarDays,
  TrendingUp,
  Syringe,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  XCircle,
  Clock,
  Flame,
  Snowflake,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';

const breedingAlerts = [];
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

function upsertBreedingCacheLog(tenantId, farmId, log) {
  const current = readCachedBreedingLogs(tenantId, farmId);
  const dedupeKey = `${log.id ?? ''}|${log.cowId ?? ''}|${log.aiDate ?? ''}|${log.sireCode ?? ''}`;
  const next = [log, ...current.filter((item) => (`${item.id ?? ''}|${item.cowId ?? ''}|${item.aiDate ?? ''}|${item.sireCode ?? ''}`) !== dedupeKey)].slice(0, 300);
  writeCachedBreedingLogs(tenantId, farmId, next);
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

function normalizeSemenInventory(item = {}) {
  const stableId = item.id ?? item.item_id ?? item.straw_code ?? item.code ?? item.bull_code ?? item.bull_name ?? item.name;

  return {
    id: String(stableId ?? '').trim() || `bull-${Date.now()}`,
    name: item.name ?? item.bull_name ?? 'Unnamed Bull',
    code: item.code ?? item.bull_code ?? item.straw_code ?? '',
    strawsLeft: Number(item.strawsLeft ?? item.straws_left ?? item.stock_level ?? item.quantity ?? 0),
    improves: item.improves ?? item.breed_improvement ?? item.breed ?? item.best_for ?? item.purpose ?? '',
  };
}

function normalizeBreedingLog(log = {}) {
  const rawAiDate = log.aiDate
    ?? log.ai_date
    ?? log.insemination_date
    ?? log.service_date
    ?? log.event_date
    ?? log.date
    ?? log.created_at
    ?? '';
  const aiDate = normalizeDateForApi(rawAiDate) || '';
  const computedDaysPostAI = aiDate
    ? Math.max(0, Math.floor((Date.now() - new Date(aiDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const daysPostAI = Number(log.daysPostAI ?? log.days_post_ai ?? computedDaysPostAI);
  const expectedCalvingDate = log.expectedCalvingDate ?? log.expected_calving_date ?? log.calving_due_date ?? null;
  const rawStatus = String(log.status ?? log.check_status ?? log.outcome_status ?? 'Pending').trim().toLowerCase();
  let status = 'Pending';
  const rawProvidedBy = String(log.provided_by ?? '').trim().toLowerCase();
  const rawSource = String(log.semenSource ?? log.semen_source ?? '').trim().toLowerCase();
  const rawSourceLabel = String(log.semen_source_label ?? '').trim().toLowerCase();
  const cowId = String(
    log.cowId
    ?? log.cow_id
    ?? log.cow_tag
    ?? log.tag_number
    ?? log.animal_id
    ?? log.cow
    ?? ''
  ).trim();
  const cowName = String(
    log.cowName
    ?? log.cow_name
    ?? log.animal_name
    ?? log.name
    ?? ''
  ).trim();

  if (['pregnant', 'in-calf', 'incalf', 'confirmed_pregnant'].includes(rawStatus)) {
    status = 'Pregnant';
  } else if (['open', 'not pregnant', 'not_pregnant', 'negative'].includes(rawStatus)) {
    status = 'Open';
  } else if (['pending', 'pending check', 'pending_check', 'awaiting_check', 'awaiting'].includes(rawStatus)) {
    status = 'Pending';
  }

  return {
    id: log.id ?? log.log_id ?? log.breeding_log_id ?? `log-${Date.now()}`,
    cowId,
    cowName,
    aiDate,
    sireCode: log.sireCode
      ?? log.sire_code
      ?? log.semen_id
      ?? log.external_sire_code
      ?? log.straw_code
      ?? log.bull_code
      ?? log.bull_name
      ?? '',
    semenSource: rawSource
      || (rawProvidedBy === 'vet' ? 'vet_provided' : '')
      || (rawProvidedBy === 'inventory' ? 'farm_stock' : '')
      || (rawSourceLabel.includes('vet') ? 'vet_provided' : '')
      || (rawSourceLabel.includes('farm') || rawSourceLabel.includes('stock') ? 'farm_stock' : 'unknown'),
    expectedCalvingDate,
    daysPostAI,
    status,
    notes: log.note ?? log.notes ?? '',
  };
}

function normalizeHerdOption(cow = {}) {
  const id = String(cow.tag_number ?? cow.tagNumber ?? cow.tag ?? cow.cow_id ?? cow.ear_tag ?? cow.id ?? '').trim();
  const name = String(cow.name ?? cow.cow_name ?? cow.animal_name ?? '').trim();
  const display = name ? `${id} (${name})` : id;

  return {
    id,
    name,
    display,
  };
}

function normalizeDateForApi(rawDate = '') {
  const input = String(rawDate ?? '').trim();
  if (!input) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function normalizeSemenCode(rawCode = '') {
  return String(rawCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

function resolveCowId(rawValue = '', herdOptions = []) {
  const input = String(rawValue).trim();
  if (!input) return '';

  const exact = herdOptions.find((option) => (
    option.id.toLowerCase() === input.toLowerCase()
    || option.name.toLowerCase() === input.toLowerCase()
    || option.display.toLowerCase() === input.toLowerCase()
  ));

  if (exact?.id) {
    return exact.id;
  }

  const parsedFromDisplay = input.match(/^([^()]+)\s*\(/);
  if (parsedFromDisplay?.[1]) {
    return parsedFromDisplay[1].trim();
  }

  return input;
}

function resolveCowIdentity(rawValue = '', herdOptions = []) {
  const input = String(rawValue).trim();
  if (!input) return { id: '', name: '' };

  const exact = herdOptions.find((option) => (
    option.id.toLowerCase() === input.toLowerCase()
    || option.name.toLowerCase() === input.toLowerCase()
    || option.display.toLowerCase() === input.toLowerCase()
  ));

  if (exact) {
    return { id: exact.id, name: exact.name || '' };
  }

  const parsedFromDisplay = input.match(/^([^()]+)\s*\(([^)]+)\)$/);
  if (parsedFromDisplay) {
    return {
      id: parsedFromDisplay[1].trim(),
      name: parsedFromDisplay[2].trim(),
    };
  }

  return { id: resolveCowId(input, herdOptions), name: '' };
}

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
  if (log.cowId && log.cowName) {
    return `${log.cowId} (${log.cowName})`;
  }

  return log.cowId || log.cowName || 'Unknown Cow';
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
      return entry.cowId.toLowerCase().includes(normalizedSearch);
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
function BreedingHeader({ metrics, onLogService }) {
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
      <button 
        onClick={onLogService}
        className="btn-command flex items-center gap-2 text-sm bg-brand text-surface shadow-md hover:bg-brand-dark transition-colors"
      >
        <Syringe size={16} /> Log AI Service
      </button>
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
function HeatAlerts({ alerts }) {
  if (alerts.length === 0) return null;

  return (
    <div className="card-machined border-danger/20 bg-danger/5 p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-danger">
        <Flame size={18} /> Action Needed: Cows in Heat
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between rounded-lg bg-surface p-4 shadow-sm border border-danger/10">
            <div>
              <h4 className="font-black text-brand text-lg">{alert.cowId}</h4>
              <p className="text-xs font-bold text-danger mt-1">{alert.status}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-danger block">{alert.action}</span>
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
      isReady ? 'border-brand/20 bg-surface shadow-sm' : 'border-ink/5 bg-surface/50 opacity-80'
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
    <div className="card-machined bg-surface p-6 h-full border border-ink/5 shadow-sm">
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
  const [vetQueue, setVetQueue] = useState(initialVetQueue);
  const [vetHistory, setVetHistory] = useState(INITIAL_HISTORY);
  const [inventory, setInventory] = useState(bullStock);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [historyControlsOpen, setHistoryControlsOpen] = useState(false);
  const [logForm, setLogForm] = useState({ cowId: '', aiDate: '', sireCode: '', semenSource: 'farm_stock', note: '' });
  const [inventoryForm, setInventoryForm] = useState({ name: '', code: '', strawsLeft: '', improves: '' });
  const [restockForm, setRestockForm] = useState({ amount: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusUpdatingById, setStatusUpdatingById] = useState({});
  const [isCowPickerOpen, setIsCowPickerOpen] = useState(false);
  const cowPickerRef = useRef(null);
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

  const filteredCowOptions = useMemo(() => {
    const query = logForm.cowId.trim().toLowerCase();
    if (!query) return herdOptions.slice(0, 12);

    return herdOptions
      .filter((option) => (
        option.id.toLowerCase().includes(query)
        || option.name.toLowerCase().includes(query)
        || option.display.toLowerCase().includes(query)
      ))
      .slice(0, 12);
  }, [herdOptions, logForm.cowId]);

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

  const { data: breedingPerformance } = useQuery({
    queryKey: ['breeding', 'performance', tenantId, farmId],
    queryFn: async () => {
      try {
        return await breedingApi.breedingPerformance();
      } catch (error) {
        console.error('Failed to load breeding performance:', error);
        return null;
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

  useEffect(() => {
    if (Array.isArray(semenInventoryData) && inventory.length === 0) {
      setInventory(semenInventoryData.map(normalizeSemenInventory));
    }
  }, [inventory.length, semenInventoryData]);

  useEffect(() => {
    if (Array.isArray(breedingLogsData)) {
      const normalizedServer = breedingLogsData.map(normalizeBreedingLog);
      const normalizedCached = readCachedBreedingLogs(tenantId, farmId).map(normalizeBreedingLog);
      const normalized = mergeBreedingLogs(normalizedServer, normalizedCached);

      writeCachedBreedingLogs(tenantId, farmId, normalized);
      setVetHistory(normalized.map((log) => createHistoryEntry(log, log.status, log.notes)));
      setVetQueue(normalized.filter((log) => log.status === 'Pending'));
    }
  }, [breedingLogsData, tenantId, farmId]);

  useEffect(() => {
    if (!isLogServiceOpen) return undefined;

    const handleClickOutside = (event) => {
      if (cowPickerRef.current && !cowPickerRef.current.contains(event.target)) {
        setIsCowPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLogServiceOpen]);

  const performanceSummary = useMemo(() => {
    if (!breedingPerformance || typeof breedingPerformance !== 'object') {
      return null;
    }

    const daughtersYield = Number(breedingPerformance.daughtersYield ?? breedingPerformance.daughters_yield ?? breedingPerformance.daughtersMilkYield ?? 0);
    const mothersYield = Number(breedingPerformance.mothersYield ?? breedingPerformance.mothers_yield ?? breedingPerformance.mothersMilkYield ?? 0);
    const changePercent = Number(breedingPerformance.changePercent ?? breedingPerformance.change_percent ?? breedingPerformance.deltaPercent ?? breedingPerformance.delta_percent ?? 0);

    if (!daughtersYield && !mothersYield && !changePercent) {
      return null;
    }

    return {
      daughtersYield,
      mothersYield,
      changePercent,
      note: breedingPerformance.note ?? breedingPerformance.summary ?? '',
    };
  }, [breedingPerformance]);

  // Derived State for KPI Chips
  const metrics = {
    onHeat: breedingAlerts.length,
    pendingDueNow: vetQueue.filter((log) => log.daysPostAI >= 45).length,
    pendingTotal: vetQueue.length,
    totalStraws: inventory.reduce((total, bull) => total + bull.strawsLeft, 0)
  };

  const handleOutcome = async (logId, outcome) => {
    if (statusUpdatingById[logId]) return;

    const status = outcome === 'Pregnant' ? 'Pregnant' : 'Open';
    setStatusUpdatingById((current) => ({ ...current, [logId]: true }));

    try {
      await breedingApi.updateLogStatus(logId, status);
      setInfoMessage(`Cow marked as ${outcome}. Records updated.`);
      removeBreedingCacheLog(tenantId, farmId, logId);
      setVetQueue((current) => current.filter((log) => log.id !== logId));
      setVetHistory((current) =>
        current.map((entry) => {
          if (entry.id !== logId) return entry;

          return {
            ...entry,
            status,
            outcome: status === 'Pregnant' ? 'Pregnant (In-Calf)' : 'Open (Not Pregnant)',
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          };
        })
      );
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

  const handleLogService = () => {
    setIsCowPickerOpen(false);
    setIsLogServiceOpen(true);
  };

  const filteredHistory = getFilteredHistory(vetHistory, historyFilter, historySearch);
  const groupedHistory = groupHistoryByMonth(filteredHistory);
  const hasActiveHistoryFilters = historyFilter !== 'All' || historySearch.trim() !== '';
  const activeHistoryControlCount = [historySearch.trim(), historyFilter !== 'All'].filter(Boolean).length;

  const handleAddHistoryEntry = async (event) => {
    event.preventDefault();
    setFormErrors({});
    setShowError(false);

    // Validate
    const validationSchema = {
      cowId: [ValidationRules.required],
      sireCode: [ValidationRules.required],
      semenSource: [ValidationRules.required],
    };

    const errors = validateForm(logForm, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);

      const resolvedCow = resolveCowIdentity(logForm.cowId, herdOptions);

      const newLog = {
        id: `log_${Date.now().toString(36)}`,
        cowId: resolvedCow.id,
        cowName: resolvedCow.name,
        aiDate: normalizeDateForApi(logForm.aiDate || new Date().toISOString().slice(0, 10)),
        sireCode: normalizeSemenCode(logForm.sireCode),
        semenSource: logForm.semenSource,
        daysPostAI: 0,
      };

      if (!newLog.aiDate || !/^\d{4}-\d{2}-\d{2}$/.test(newLog.aiDate)) {
        setErrorMessage('AI Date must be in YYYY-MM-DD format.');
        setShowError(true);
        setIsSaving(false);
        return;
      }

      if (!/^[A-Z0-9][A-Z0-9-]{1,30}$/.test(newLog.sireCode)) {
        setFormErrors((current) => ({ ...current, sireCode: 'Use letters/numbers (hyphen allowed), e.g. FR-889.' }));
        setErrorMessage('Sire code format is invalid.');
        setShowError(true);
        setIsSaving(false);
        return;
      }

      const createResponse = await breedingApi.createLog({
        cowId: newLog.cowId,
        cow_name: newLog.cowName,
        aiDate: newLog.aiDate,
        sireCode: newLog.sireCode,
        semenSource: newLog.semenSource,
        note: logForm.note.trim(),
        status: 'Pending',
      });

      const savedLog = normalizeBreedingLog({
        ...createResponse,
        cowId: createResponse?.cow_id ?? createResponse?.cowId ?? newLog.cowId,
        cowName: createResponse?.cow_name ?? createResponse?.cowName ?? newLog.cowName,
        aiDate: createResponse?.insemination_date ?? createResponse?.aiDate ?? newLog.aiDate,
        sireCode: createResponse?.external_sire_code ?? createResponse?.semen_id ?? createResponse?.sireCode ?? newLog.sireCode,
        semenSource: createResponse?.semen_source
          ?? (String(createResponse?.provided_by ?? '').toUpperCase() === 'VET' ? 'vet_provided' : null)
          ?? newLog.semenSource,
        expectedCalvingDate: createResponse?.expected_calving_date ?? createResponse?.expectedCalvingDate ?? null,
        status: createResponse?.status ?? 'Pending',
      });

      upsertBreedingCacheLog(tenantId, farmId, savedLog);

      if (!savedLog.semenSource) {
        savedLog.semenSource = newLog.semenSource;
      }

      const entry = createHistoryEntry(savedLog, 'Pending', logForm.note.trim());
      setVetQueue((current) => [...current, savedLog]);
      setVetHistory((current) => [entry, ...current]);

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'ai_service',
          recordId: newLog.id,
          userName: 'You',
          notes: `Logged AI service for ${newLog.cowId} with sire ${newLog.sireCode}`,
        })
      );

      setInfoMessage(`Logged AI service for ${newLog.cowId}.`);
      setLogForm({ cowId: '', aiDate: '', sireCode: '', semenSource: 'farm_stock', note: '' });
      setIsCowPickerOpen(false);
      setIsLogServiceOpen(false);
    } catch (error) {
      console.error('Error logging service:', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to log AI service. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInventory = async (event) => {
    event.preventDefault();
    setFormErrors({});
    setShowError(false);

    // Validate
    const validationSchema = {
      name: [ValidationRules.required],
      code: [ValidationRules.required],
      strawsLeft: [ValidationRules.required, ValidationRules.positiveNumber],
      improves: [ValidationRules.required],
    };

    const errors = validateForm(inventoryForm, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);

      const inventoryPayload = {
        bull_name: inventoryForm.name.trim(),
        straw_code: String(inventoryForm.code).trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, ''),
        breed: inventoryForm.improves.trim(),
        strawsLeft: Number(inventoryForm.strawsLeft) || 0,
        name: inventoryForm.name.trim(),
        code: inventoryForm.code.trim(),
        improves: inventoryForm.improves.trim(),
      };

      const createdInventory = await breedingApi.createSemenInventory(inventoryPayload);
      const nextInventory = normalizeSemenInventory({
        ...inventoryPayload,
        ...createdInventory,
        improves: createdInventory?.improves
          ?? createdInventory?.breed
          ?? createdInventory?.breed_improvement
          ?? inventoryPayload.improves,
      });

      setInventory((current) => [nextInventory, ...current]);

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'semen_inventory',
          recordId: nextInventory.id,
          userName: 'You',
          notes: `Added ${nextInventory.name} (${nextInventory.code}) - ${nextInventory.strawsLeft} straws`,
        })
      );

      setInfoMessage(`Added ${nextInventory.name} to inventory.`);
      setInventoryForm({ name: '', code: '', strawsLeft: '', improves: '' });
      setIsInventoryOpen(false);
    } catch (error) {
      console.error('Error adding inventory:', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to add inventory. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenRestock = (bull) => {
    setSelectedInventoryItem(bull);
    setRestockForm({ amount: '' });
    setFormErrors({});
    setIsRestockOpen(true);
  };

  const handleConfirmRestock = async (event) => {
    event.preventDefault();
    setFormErrors({});

    const amount = Number(restockForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormErrors((current) => ({ ...current, restockAmount: 'Enter a quantity greater than 0.' }));
      return;
    }

    if (!selectedInventoryItem) {
      setErrorMessage('Select an inventory item before restocking.');
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);
      const nextStrawCount = Number(selectedInventoryItem.strawsLeft || 0) + amount;
      const payload = {
        name: selectedInventoryItem.name,
        code: selectedInventoryItem.code,
        improves: selectedInventoryItem.improves,
        strawsLeft: nextStrawCount,
      };

      const response = await breedingApi.updateSemenInventory(selectedInventoryItem.id, payload);
      const updated = normalizeSemenInventory({ ...selectedInventoryItem, ...payload, ...response, strawsLeft: nextStrawCount });

      setInventory((current) => current.map((item) => (item.id === selectedInventoryItem.id ? updated : item)));

      logToAuditTrail(
        createAuditEntry({
          action: 'update',
          recordType: 'semen_inventory',
          recordId: updated.id,
          userName: 'You',
          notes: `Restocked ${updated.name} (${updated.code}) by ${amount} straws`,
        })
      );

      setInfoMessage(`Restocked ${updated.name} by ${amount} straws.`);
      setIsRestockOpen(false);
      setSelectedInventoryItem(null);
      setRestockForm({ amount: '' });
    } catch (error) {
      console.error('Error restocking inventory:', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to restock semen inventory. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

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

      setInfoMessage(`Deleted ${bull.name} from semen inventory.`);
    } catch (error) {
      console.error('Error deleting inventory:', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to delete semen inventory. Please try again.');
      setShowError(true);
    } finally {
      confirmation.setLoading(false);
      confirmation.close();
    }
  };

  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type="error" title="Error" message={errorMessage} autoDismiss={4000} onDismiss={() => setShowError(false)} />
        </div>
      )}

      {infoMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type="success" title="Success" message={infoMessage} autoDismiss={2400} onDismiss={() => setInfoMessage('')} />
        </div>
      )}

      <BreedingHeader metrics={metrics} onLogService={handleLogService} />

      {/* Main Layout Grid: Action (Left) vs Resources (Right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* LEFT COLUMN: ACTION & TRACKING */}
        <div className="space-y-6 lg:col-span-2">
          
          <HeatAlerts alerts={breedingAlerts} />

          <div className="card-machined bg-surface p-6 border border-ink/5 shadow-sm">
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

            {performanceSummary ? (
              <>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Daughters' Yield</p>
                    <div className="text-3xl font-black text-ink-strong">
                      {performanceSummary.daughtersYield.toFixed(1)} <span className="text-sm font-bold text-ink-muted">L/day</span>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Mothers' Yield</p>
                    <div className="text-3xl font-black text-ink-strong">
                      {performanceSummary.mothersYield.toFixed(1)} <span className="text-sm font-bold text-ink-muted">L/day</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-4">
                  <div className="rounded border border-brand/20 bg-brand/5 px-2 py-1 text-xs font-black text-brand">
                    {performanceSummary.changePercent > 0 ? '+' : ''}{performanceSummary.changePercent.toFixed(0)}%
                  </div>
                  <p className="text-xs font-semibold text-ink-muted">
                    {performanceSummary.note || 'Breeding performance data loaded from the backend.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-ink/10 bg-surface p-6 text-sm text-ink-muted">
                No breeding performance data yet. Connect the backend breeding summary to show genetic progress.
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

      <Modal isOpen={isLogServiceOpen} onClose={() => setIsLogServiceOpen(false)} title="Log AI Service">
        <form className="space-y-4" onSubmit={handleAddHistoryEntry}>
          <SimpleModalSection title="Service Details">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Cow ID or Name *</label>
              <div className="relative" ref={cowPickerRef}>
                <input
                  className={`input-machined w-full pr-10 ${formErrors.cowId ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={logForm.cowId}
                  onFocus={() => setIsCowPickerOpen(true)}
                  onChange={(event) => {
                    setLogForm((current) => ({ ...current, cowId: event.target.value }));
                    setIsCowPickerOpen(true);
                    if (formErrors.cowId) setFormErrors({ ...formErrors, cowId: null });
                  }}
                  placeholder="Type cow ID or name, or pick from herd list"
                  aria-invalid={!!formErrors.cowId}
                  aria-expanded={isCowPickerOpen}
                  aria-autocomplete="list"
                />
                <button
                  type="button"
                  onClick={() => setIsCowPickerOpen((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted transition-colors hover:text-brand"
                  aria-label="Toggle herd suggestions"
                >
                  <ChevronDown size={16} />
                </button>

                {isCowPickerOpen && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-ink/10 bg-surface shadow-lg">
                    {filteredCowOptions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-ink-muted">No herd matches found for this tenant.</div>
                    ) : (
                      filteredCowOptions.map((option) => (
                        <button
                          key={`cow-option-${option.id}`}
                          type="button"
                          onClick={() => {
                            setLogForm((current) => ({ ...current, cowId: option.display }));
                            setIsCowPickerOpen(false);
                            if (formErrors.cowId) setFormErrors({ ...formErrors, cowId: null });
                          }}
                          className="flex w-full items-center justify-between gap-3 border-b border-ink/5 px-3 py-2 text-left last:border-b-0 hover:bg-brand/5"
                        >
                          <span className="text-sm font-semibold text-ink-strong">{option.id}</span>
                          <span className="truncate text-xs text-ink-muted">{option.name || 'No name'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {herdOptions.length > 0 && (
                <p className="mt-1 text-[11px] text-ink-muted">Suggestions include all herd cows in the active tenant/farm. You can enter either cow ID or cow name.</p>
              )}
              {formErrors.cowId && <p className="mt-1 text-xs text-rose-600">{formErrors.cowId}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Date</label>
                <input type="date" className="input-machined w-full" value={logForm.aiDate} onChange={(event) => setLogForm((current) => ({ ...current, aiDate: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Sire Code</label>
                <input
                  className={`input-machined w-full ${formErrors.sireCode ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={logForm.sireCode}
                  onChange={(event) => {
                    setLogForm((current) => ({ ...current, sireCode: normalizeSemenCode(event.target.value) }));
                    if (formErrors.sireCode) setFormErrors({ ...formErrors, sireCode: null });
                  }}
                  placeholder="e.g. FR-889"
                />
                {formErrors.sireCode && <p className="mt-1 text-xs text-rose-600">{formErrors.sireCode}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Notes</label>
              <textarea className="input-machined w-full min-h-[96px]" value={logForm.note} onChange={(event) => setLogForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional service notes" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink-muted">Semen Source *</label>
              <div className={`grid grid-cols-1 gap-2 rounded-lg border p-2 md:grid-cols-2 ${formErrors.semenSource ? 'border-rose-300 bg-rose-50' : 'border-ink/10 bg-surface-raised'}`}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
                  <input
                    type="radio"
                    name="semen-source"
                    value="farm_stock"
                    checked={logForm.semenSource === 'farm_stock'}
                    onChange={(event) => {
                      setLogForm((current) => ({ ...current, semenSource: event.target.value }));
                      if (formErrors.semenSource) setFormErrors({ ...formErrors, semenSource: null });
                    }}
                  />
                  Farm Stock
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
                  <input
                    type="radio"
                    name="semen-source"
                    value="vet_provided"
                    checked={logForm.semenSource === 'vet_provided'}
                    onChange={(event) => {
                      setLogForm((current) => ({ ...current, semenSource: event.target.value }));
                      if (formErrors.semenSource) setFormErrors({ ...formErrors, semenSource: null });
                    }}
                  />
                  Vet Provided
                </label>
              </div>
              {formErrors.semenSource && <p className="mt-1 text-xs text-rose-600">{formErrors.semenSource}</p>}
            </div>
          </SimpleModalSection>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={isSaving} onClick={() => setIsLogServiceOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-command px-4 py-2 text-sm">{isSaving ? 'Saving...' : 'Save Service'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Historical Checks">
        <div className="space-y-4">
          <SimpleModalSection title="All Checks">
            <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  <Search size={12} /> Search and filters
                </div>
                <p className="mt-1 text-sm leading-6 text-ink-muted">Filter breeding history by record status or cow ID.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  {activeHistoryControlCount} active
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryControlsOpen((current) => !current)}
                  aria-expanded={historyControlsOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
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
                      placeholder="Search cow ID..."
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
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-ink/10 bg-surface px-3 py-2 text-xs font-black uppercase tracking-widest text-brand shadow-sm">
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
        <form className="space-y-4" onSubmit={handleAddInventory}>
          <SimpleModalSection title="Inventory Item">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Name *</label>
              <input 
                className={`input-machined w-full ${formErrors.name ? 'border-rose-300 bg-rose-50' : ''}`}
                value={inventoryForm.name}
                onChange={(event) => {
                  setInventoryForm((current) => ({ ...current, name: event.target.value }));
                  if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                }}
                placeholder="e.g. Jersey Bull"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Code *</label>
                <input 
                  className={`input-machined w-full ${formErrors.code ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={inventoryForm.code}
                  onChange={(event) => {
                    setInventoryForm((current) => ({ ...current, code: event.target.value }));
                    if (formErrors.code) setFormErrors({ ...formErrors, code: null });
                  }}
                  placeholder="e.g. JY-312"
                  aria-invalid={!!formErrors.code}
                />
                {formErrors.code && <p className="mt-1 text-xs text-rose-600">{formErrors.code}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Straws Left *</label>
                <input 
                  type="number" 
                  min="0" 
                  className={`input-machined w-full ${formErrors.strawsLeft ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={inventoryForm.strawsLeft}
                  onChange={(event) => {
                    setInventoryForm((current) => ({ ...current, strawsLeft: event.target.value }));
                    if (formErrors.strawsLeft) setFormErrors({ ...formErrors, strawsLeft: null });
                  }}
                  placeholder="e.g. 6"
                  aria-invalid={!!formErrors.strawsLeft}
                />
                {formErrors.strawsLeft && <p className="mt-1 text-xs text-rose-600">{formErrors.strawsLeft}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Breed *</label>
              <input
                className={`input-machined w-full ${formErrors.improves ? 'border-rose-300 bg-rose-50' : ''}`}
                value={inventoryForm.improves}
                onChange={(event) => {
                  setInventoryForm((current) => ({ ...current, improves: event.target.value }));
                  if (formErrors.improves) setFormErrors({ ...formErrors, improves: null });
                }}
                placeholder="e.g. Friesian"
              />
              {formErrors.improves && <p className="mt-1 text-xs text-rose-600">{formErrors.improves}</p>}
            </div>
          </SimpleModalSection>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={isSaving} onClick={() => setIsInventoryOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-command px-4 py-2 text-sm">{isSaving ? 'Saving...' : 'Add Inventory'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRestockOpen}
        onClose={() => {
          setIsRestockOpen(false);
          setSelectedInventoryItem(null);
          setRestockForm({ amount: '' });
        }}
        title="Restock Semen Inventory"
      >
        <form className="space-y-4" onSubmit={handleConfirmRestock}>
          <SimpleModalSection title="Restock Details">
            <div className="rounded-lg border border-brand/10 bg-brand/5 p-3 text-sm text-ink-strong">
              <div className="font-bold">{selectedInventoryItem?.name || 'Selected Item'}</div>
              <div className="text-xs text-ink-muted">Code: {selectedInventoryItem?.code || 'N/A'}</div>
              <div className="text-xs text-ink-muted">Current stock: {selectedInventoryItem?.strawsLeft ?? 0} straws</div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Add Straws *</label>
              <input
                type="number"
                min="1"
                className={`input-machined w-full ${formErrors.restockAmount ? 'border-rose-300 bg-rose-50' : ''}`}
                value={restockForm.amount}
                onChange={(event) => {
                  setRestockForm({ amount: event.target.value });
                  if (formErrors.restockAmount) {
                    setFormErrors((current) => ({ ...current, restockAmount: null }));
                  }
                }}
                placeholder="e.g. 20"
                aria-invalid={!!formErrors.restockAmount}
              />
              {formErrors.restockAmount && <p className="mt-1 text-xs text-rose-600">{formErrors.restockAmount}</p>}
            </div>
          </SimpleModalSection>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsRestockOpen(false);
                setSelectedInventoryItem(null);
                setRestockForm({ amount: '' });
              }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-command px-4 py-2 text-sm">
              {isSaving ? 'Saving...' : 'Restock'}
            </button>
          </div>
        </form>
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