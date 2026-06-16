import React, { useState, useEffect, useRef } from 'react';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';
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
  ChevronRight,
  Search
} from 'lucide-react';

// ============================================================================
// MOCK DATA (Usually fetched from an API context)
// ============================================================================
const breedingAlerts = [
  { id: 'h1', cowId: 'C-102 (Luna)', status: 'On Heat Today', urgency: 'High', action: 'Serve before 6:00 PM' },
];

const bullStock = [
  { id: 's1', name: 'KAGRC Premium Friesian', code: 'FR-889', strawsLeft: 4, improves: 'More Milk Volume' },
  { id: 's2', name: 'Highland Ayrshire', code: 'AY-201', strawsLeft: 2, improves: 'Higher Butterfat (%)' },
];

const initialVetQueue = [
  {
    id: 'log_8x9',
    cowId: 'C-104 (Daisy)',
    aiDate: '2026-04-10',
    sireCode: 'FR-889',
    daysPostAI: 46,
  },
  {
    id: 'log_2b4',
    cowId: 'C-105 (Bella)',
    aiDate: '2026-04-25',
    sireCode: 'AY-201',
    daysPostAI: 31,
  },
];

const INITIAL_HISTORY = [
  {
    id: 'hist_001',
    cowId: 'C-101 (Luna)',
    aiDate: '2026-03-14',
    sireCode: 'FR-889',
    daysPostAI: 63,
    status: 'Pregnant',
    outcome: 'Pregnant (In-Calf)',
    notes: 'Confirmed by vet scan',
    updatedAt: 'May 18, 2026',
  },
  {
    id: 'hist_002',
    cowId: 'C-102 (Mara)',
    aiDate: '2026-03-04',
    sireCode: 'AY-201',
    daysPostAI: 72,
    status: 'Open',
    outcome: 'Open (Not Pregnant)',
    notes: 'Recheck in next cycle',
    updatedAt: 'May 21, 2026',
  },
  {
    id: 'hist_003',
    cowId: 'C-103 (Nia)',
    aiDate: '2026-04-20',
    sireCode: 'FR-889',
    daysPostAI: 38,
    status: 'Pending',
    outcome: 'Pending Check',
    notes: 'Awaiting vet window',
    updatedAt: 'Jun 16, 2026',
  },
  {
    id: 'hist_004',
    cowId: 'C-104 (Daisy)',
    aiDate: '2026-04-10',
    sireCode: 'FR-889',
    daysPostAI: 46,
    status: 'Pending',
    outcome: 'Pending Check',
    notes: 'Ready for pregnancy check',
    updatedAt: 'Jun 16, 2026',
  },
  {
    id: 'hist_005',
    cowId: 'C-105 (Bella)',
    aiDate: '2026-04-25',
    sireCode: 'AY-201',
    daysPostAI: 31,
    status: 'Pending',
    outcome: 'Pending Check',
    notes: 'Too early for check',
    updatedAt: 'Jun 16, 2026',
  },
  {
    id: 'hist_006',
    cowId: 'C-106 (Mimi)',
    aiDate: '2026-02-12',
    sireCode: 'FR-889',
    daysPostAI: 91,
    status: 'Pregnant',
    outcome: 'Pregnant (In-Calf)',
    notes: 'Pregnancy confirmed after second scan',
    updatedAt: 'May 27, 2026',
  },
];

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
    updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  };
}

function getStatusTone(status) {
  if (status === 'Pregnant') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'Open') return 'border-rose-500/30 bg-rose-500/10 text-rose-600';
  return 'border-brand/20 bg-brand/10 text-brand';
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
            <Stethoscope size={14} /> {metrics.pendingChecks} Pending Checks
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
function VetQueueItem({ log, onOutcome }) {
  const isReady = log.daysPostAI >= 45;

  return (
    <div className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors md:flex-row md:items-center md:justify-between ${
      isReady ? 'border-brand/20 bg-surface shadow-sm' : 'border-ink/5 bg-surface/50 opacity-80'
    }`}>
      <div>
        <h4 className={`font-bold text-base ${isReady ? 'text-brand' : 'text-ink-strong'}`}>{log.cowId}</h4>
        <div className="mt-1 flex gap-3 font-mono text-xs text-ink-muted">
          <span>Served: {log.aiDate}</span>
          <span aria-hidden="true">•</span>
          <span>Bull: {log.sireCode}</span>
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
              className="flex items-center gap-1 rounded-md border border-danger/20 bg-white px-3 py-2 text-xs font-bold text-danger transition-colors hover:bg-danger/5"
            >
              <XCircle size={14} /> Mark Open
            </button>
            <button
              onClick={() => onOutcome(log.id, 'Pregnant')}
              className="flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-bold text-surface shadow-sm transition-colors hover:bg-brand-dark"
            >
              <CheckCircle2 size={14} /> Confirm Pregnant
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
function SemenInventory({ stock, onAddInventory }) {
  return (
    <div className="card-machined bg-surface p-6 h-full border border-ink/5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand">
          <Snowflake size={18} className="text-accent" /> Semen Inventory
        </h3>
      </div>

      <div className="space-y-3">
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
  const [vetQueue, setVetQueue] = useState(initialVetQueue);
  const [vetHistory, setVetHistory] = useState(INITIAL_HISTORY);
  const [inventory, setInventory] = useState(bullStock);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [logForm, setLogForm] = useState({ cowId: '', aiDate: '', sireCode: '', note: '' });
  const [inventoryForm, setInventoryForm] = useState({ name: '', code: '', strawsLeft: '', improves: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const confirmation = useConfirmation();

  // Derived State for KPI Chips
  const metrics = {
    onHeat: breedingAlerts.length,
    pendingChecks: vetQueue.filter(log => log.daysPostAI >= 45).length,
    totalStraws: inventory.reduce((total, bull) => total + bull.strawsLeft, 0)
  };

  const handleOutcome = (logId, outcome) => {
    setInfoMessage(`Cow marked as ${outcome}. Records updated.`);
    setVetQueue((current) => current.filter((log) => log.id !== logId));
    setVetHistory((current) =>
      current.map((entry) => {
        if (entry.id !== logId) return entry;

        const status = outcome === 'Pregnant' ? 'Pregnant' : 'Open';
        return {
          ...entry,
          status,
          outcome: status === 'Pregnant' ? 'Pregnant (In-Calf)' : 'Open (Not Pregnant)',
          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        };
      })
    );
  };

  const handleLogService = () => {
    setIsLogServiceOpen(true);
  };

  const filteredHistory = getFilteredHistory(vetHistory, historyFilter, historySearch);
  const groupedHistory = groupHistoryByMonth(filteredHistory);
  const hasActiveHistoryFilters = historyFilter !== 'All' || historySearch.trim() !== '';

  const handleAddHistoryEntry = async (event) => {
    event.preventDefault();
    setFormErrors({});
    setShowError(false);

    // Validate
    const validationSchema = {
      cowId: [ValidationRules.required, ValidationRules.minLength(3)],
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
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newLog = {
        id: `log_${Date.now().toString(36)}`,
        cowId: logForm.cowId.trim(),
        aiDate: logForm.aiDate || new Date().toISOString().slice(0, 10),
        sireCode: logForm.sireCode.trim() || 'TBD',
        daysPostAI: 0,
      };

      const entry = createHistoryEntry(newLog, 'Pending', logForm.note.trim());
      setVetQueue((current) => [...current, newLog]);
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
      setLogForm({ cowId: '', aiDate: '', sireCode: '', note: '' });
      setIsLogServiceOpen(false);
    } catch (error) {
      console.error('Error logging service:', error);
      setErrorMessage('Failed to log AI service. Please try again.');
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
      await new Promise((resolve) => setTimeout(resolve, 300));

      const nextInventory = {
        id: `s_${Date.now().toString(36)}`,
        name: inventoryForm.name.trim(),
        code: inventoryForm.code.trim(),
        strawsLeft: Number(inventoryForm.strawsLeft) || 0,
        improves: inventoryForm.improves.trim(),
      };

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
      setErrorMessage('Failed to add inventory. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
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
                <VetQueueItem key={log.id} log={log} onOutcome={handleOutcome} />
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

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Daughters' Yield</p>
                <div className="text-3xl font-black text-ink-strong">
                  26.5 <span className="text-sm font-bold text-ink-muted">L/day</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Mothers' Yield</p>
                <div className="text-3xl font-black text-ink-strong">
                  22.0 <span className="text-sm font-bold text-ink-muted">L/day</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-4">
              <div className="rounded border border-brand/20 bg-brand/5 px-2 py-1 text-xs font-black text-brand">
                + 20%
              </div>
              <p className="text-xs font-semibold text-ink-muted">
                Your breeding strategy is working. Heifers are outperforming their mothers.
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RESOURCES */}
        <div className="h-full">
          <SemenInventory stock={inventory} onAddInventory={() => setIsInventoryOpen(true)} />
        </div>

      </div>

      <Modal isOpen={isLogServiceOpen} onClose={() => setIsLogServiceOpen(false)} title="Log AI Service">
        <form className="space-y-4" onSubmit={handleAddHistoryEntry}>
          <SimpleModalSection title="Service Details">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Cow ID *</label>
              <input 
                className={`input-machined w-full ${formErrors.cowId ? 'border-rose-300 bg-rose-50' : ''}`}
                value={logForm.cowId}
                onChange={(event) => {
                  setLogForm((current) => ({ ...current, cowId: event.target.value }));
                  if (formErrors.cowId) setFormErrors({ ...formErrors, cowId: null });
                }}
                placeholder="e.g. C-109 (Nia)"
                aria-invalid={!!formErrors.cowId}
              />
              {formErrors.cowId && <p className="mt-1 text-xs text-rose-600">{formErrors.cowId}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Date</label>
                <input type="date" className="input-machined w-full" value={logForm.aiDate} onChange={(event) => setLogForm((current) => ({ ...current, aiDate: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Sire Code</label>
                <input className="input-machined w-full" value={logForm.sireCode} onChange={(event) => setLogForm((current) => ({ ...current, sireCode: event.target.value }))} placeholder="e.g. FR-889" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Notes</label>
              <textarea className="input-machined w-full min-h-[96px]" value={logForm.note} onChange={(event) => setLogForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional service notes" />
            </div>
          </SimpleModalSection>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={isSaving} onClick={() => setIsLogServiceOpen(false)} className="rounded-lg border border-ink/20 px-4 py-2 text-sm font-bold text-ink-muted transition-colors hover:bg-ink/5">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-command px-4 py-2 text-sm">{isSaving ? 'Saving...' : 'Save Service'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Historical Checks">
        <div className="space-y-4">
          <SimpleModalSection title="All Checks">
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
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Status</th>
                          <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink-muted">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-t border-ink/5 align-top hover:bg-surface/50">
                            <td className="px-2 py-2">
                              <div className="font-bold text-ink-strong">{entry.cowId}</div>
                              {entry.notes && <div className="mt-1 text-[11px] text-ink-muted">{entry.notes}</div>}
                            </td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.aiDate}</td>
                            <td className="px-2 py-2 text-sm text-ink-muted">{entry.sireCode}</td>
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
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Best For</label>
              <input
                className="input-machined w-full"
                value={inventoryForm.improves}
                onChange={(event) => setInventoryForm((current) => ({ ...current, improves: event.target.value }))}
                placeholder="e.g. Better fertility"
              />
            </div>
          </SimpleModalSection>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={isSaving} onClick={() => setIsInventoryOpen(false)} className="rounded-lg border border-ink/20 px-4 py-2 text-sm font-bold text-ink-muted transition-colors hover:bg-ink/5">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-command px-4 py-2 text-sm">{isSaving ? 'Saving...' : 'Add Inventory'}</button>
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