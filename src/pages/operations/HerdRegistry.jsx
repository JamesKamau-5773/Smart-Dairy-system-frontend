import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Filter,
  Scale,
  Search,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';

// Mock data with audit timestamps
const INITIAL_HERD = [
  {
    id: 'C-101',
    name: 'Luna',
    breed: 'Friesian',
    ageMonths: 38,
    status: 'Milking',
    lastCalved: '2025-03-02',
    milk: '26.5 L/day',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2026-06-14T14:20:00Z',
    updatedBy: 'James K.',
  },
  {
    id: 'C-102',
    name: 'Asha',
    breed: 'Ayrshire',
    ageMonths: 52,
    status: 'Dry',
    lastCalved: '2025-12-14',
    milk: '0.0 L/day',
    createdAt: '2024-11-20T09:15:00Z',
    updatedAt: '2026-06-12T11:45:00Z',
    updatedBy: 'System',
  },
  {
    id: 'C-103',
    name: 'Nia',
    breed: 'Jersey',
    ageMonths: 29,
    status: 'Milking',
    lastCalved: '2025-04-18',
    milk: '21.8 L/day',
    createdAt: '2025-03-10T08:00:00Z',
    updatedAt: '2026-06-15T09:30:00Z',
    updatedBy: 'James K.',
  },
  {
    id: 'C-104',
    name: 'Daisy',
    breed: 'Friesian',
    ageMonths: 46,
    status: 'Milking',
    lastCalved: '2025-02-10',
    milk: '24.1 L/day',
    createdAt: '2024-12-05T11:20:00Z',
    updatedAt: '2026-06-13T15:10:00Z',
    updatedBy: 'System',
  },
  {
    id: 'C-105',
    name: 'Bella',
    breed: 'Friesian',
    ageMonths: 61,
    status: 'Dry',
    lastCalved: '2025-12-01',
    milk: '0.0 L/day',
    createdAt: '2024-10-01T13:45:00Z',
    updatedAt: '2026-06-10T12:00:00Z',
    updatedBy: 'James K.',
  },
  {
    id: 'C-106',
    name: 'Mimi',
    breed: 'Ayrshire',
    ageMonths: 33,
    status: 'Milking',
    lastCalved: '2025-05-22',
    milk: '22.7 L/day',
    createdAt: '2025-02-14T10:00:00Z',
    updatedAt: '2026-06-14T16:25:00Z',
    updatedBy: 'James K.',
  },
  {
    id: 'C-107',
    name: 'Zuri',
    breed: 'Jersey',
    ageMonths: 24,
    status: 'Milking',
    lastCalved: '2025-06-09',
    milk: '19.6 L/day',
    createdAt: '2025-04-20T14:30:00Z',
    updatedAt: '2026-06-15T10:15:00Z',
    updatedBy: 'System',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

function formatAge(ageMonths) {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return `${years}y ${months}m`;
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function statusTone(status) {
  if (status === 'Milking') return 'bg-accent/20 text-brand-dark border-accent/30';
  if (status === 'Dry') return 'bg-ink/10 text-ink-muted border-ink/15';
  if (status === 'Calf') return 'bg-accent/10 text-accent-dark border-accent/20';
  if (status === 'Heifer') return 'bg-surface-raised text-ink border-ink/10';
  if (status === 'Cow') return 'bg-accent/20 text-brand-dark border-accent/30';
  return 'bg-surface-raised text-ink border-ink/10';
}

function getFilteredHerd(herd, statusFilter, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return herd
    .filter((cow) => statusFilter === 'All' || cow.status === statusFilter)
    .filter((cow) => {
      if (!normalizedSearch) return true;
      return [cow.id, cow.name, cow.breed, cow.status].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      );
    })
    .slice()
    .sort((a, b) => {
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    });
}

function getHerdSummary(herd) {
  const totalAnimals = herd.length;
  const milkingCount = herd.filter((cow) => cow.status === 'Milking').length;
  const dryCount = herd.filter((cow) => cow.status === 'Dry').length;
  const averageAgeMonths =
    totalAnimals === 0
      ? 0
      : Math.round(
        herd.reduce((sum, cow) => sum + cow.ageMonths, 0) / totalAnimals
      );
  const latestCalved = herd
    .map((cow) => cow.lastCalved)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    totalAnimals,
    milkingCount,
    dryCount,
    averageAgeMonths,
    latestCalved,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function HerdRegistry() {
  // State
  const [sortBy, setSortBy] = useState('age');
  const [statusFilter, setStatusFilter] = useState('All');
  const [herdSearch, setHerdSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [herdState, setHerdState] = useState(INITIAL_HERD);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef(null);
  const confirmation = useConfirmation();

  // Form state
  const [newCow, setNewCow] = useState({
    id: '',
    name: '',
    breed: '',
    dob: '',
    hasCalved: false,
  });

  // Derived data
  const visibleHerd = getFilteredHerd(herdState, statusFilter, herdSearch).sort((a, b) => {
    if (sortBy === 'breed') return a.breed.localeCompare(b.breed) || a.id.localeCompare(b.id);
    if (sortBy === 'status') return a.status.localeCompare(b.status) || a.id.localeCompare(b.id);
    if (sortBy === 'name') return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    return a.ageMonths - b.ageMonths;
  });

  const hasActiveFilters = statusFilter !== 'All' || herdSearch.trim() !== '';
  const herdSummary = getHerdSummary(herdState);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd/Ctrl + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to close modal
      if (event.key === 'Escape' && isAddOpen) {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddOpen]);

  // Validation schema
  const validationSchema = {
    id: [ValidationRules.required, ValidationRules.minLength(3)],
    breed: [ValidationRules.required],
  };

  // Handlers
  const handleAddCow = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setShowError(false);

    // Validate form
    const errors = validateForm(newCow, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      let ageMonths = 0;
      if (newCow.dob) {
        const dob = new Date(newCow.dob);
        const now = new Date();
        const years = now.getFullYear() - dob.getFullYear();
        const months = now.getMonth() - dob.getMonth();
        ageMonths = years * 12 + months;
      }

      let status = 'Cow';
      if (!newCow.hasCalved && ageMonths < 6) status = 'Calf';
      else if (!newCow.hasCalved && ageMonths >= 6 && ageMonths <= 15) status = 'Heifer';
      else status = 'Cow';

      const cow = {
        id: newCow.id.toUpperCase() || `C-${Math.floor(Math.random() * 900) + 100}`,
        name: newCow.name || 'Unnamed',
        breed: newCow.breed || 'Unknown',
        ageMonths,
        status: newCow.hasCalved ? 'Milking' : status,
        lastCalved: newCow.hasCalved ? newCow.dob : null,
        milk: '0.0 L/day',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'You',
      };

      // Check for duplicate ID
      if (herdState.some((c) => c.id === cow.id)) {
        setErrorMessage(`Animal with ID ${cow.id} already exists`);
        setShowError(true);
        setIsSaving(false);
        return;
      }

      setHerdState((prev) => [cow, ...prev]);

      // Log audit entry
      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'cow',
          recordId: cow.id,
          userName: 'You',
          changes: { name: { before: '', after: cow.name } },
          notes: `Added new animal: ${cow.name} (${cow.id})`,
        })
      );

      setSuccessMessage(`Successfully added ${cow.id} — ${cow.name}`);
      handleCloseModal();
    } catch (error) {
      console.error('Error adding cow:', error);
      setErrorMessage('Failed to add animal. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCow = async (cowId, cowName) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Animal?',
      message: `Are you sure you want to remove ${cowName} (${cowId}) from your herd? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Keep',
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      setHerdState((prev) => prev.filter((cow) => cow.id !== cowId));

      // Log audit entry
      logToAuditTrail(
        createAuditEntry({
          action: 'delete',
          recordType: 'cow',
          recordId: cowId,
          userName: 'You',
          notes: `Deleted animal: ${cowName} (${cowId})`,
        })
      );

      setSuccessMessage(`Removed ${cowName} from your herd`);
    } catch (error) {
      console.error('Error deleting cow:', error);
      setErrorMessage('Failed to delete animal. Please try again.');
      setShowError(true);
    } finally {
      confirmation.setLoading(false);
      confirmation.close();
    }
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setNewCow({ id: '', name: '', breed: '', dob: '', hasCalved: false });
    setFormErrors({});
    setShowError(false);
  };

  const handleClearFilters = () => {
    setStatusFilter('All');
    setHerdSearch('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-reveal space-y-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <BookOpen size={12} /> Herd List
          </div>
          <h2 className="m-0 font-sans text-3xl font-bold tracking-tight text-brand">
            My <span className="text-ink-muted">Herd</span>
          </h2>
          <p className="mt-2 font-mono text-xs text-ink-muted">
            A complete list of all animals in your boma and their current status.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Total Animals</div>
            <div className="text-2xl font-black text-ink-strong">
              {isLoading ? <Skeleton className="h-6 w-16" /> : herdSummary.totalAnimals}
            </div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Milking</div>
            <div className="text-2xl font-black text-ink-strong">
              {isLoading ? <Skeleton className="h-6 w-16" /> : herdSummary.milkingCount}
            </div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Dry</div>
            <div className="text-2xl font-black text-ink-strong">
              {isLoading ? <Skeleton className="h-6 w-16" /> : herdSummary.dryCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-command flex items-center gap-2"
            aria-label="Add new animal to herd"
          >
            + Add Cow
          </button>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {showError && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner
            type="error"
            title="Error"
            message={errorMessage}
            autoDismiss={4000}
            onDismiss={() => setShowError(false)}
          />
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner
            type="success"
            title="Success"
            message={successMessage}
            autoDismiss={2400}
            onDismiss={() => setSuccessMessage('')}
          />
        </div>
      )}

      {/* ── LIST & CONTROLS ── */}
      <div className="card-machined bg-surface/80 p-6">
        {/* Summary Strip */}
        <div className="mb-6 grid gap-3 border-b border-ink/10 pb-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Registry Summary</div>
            <div className="mt-1 text-lg font-black text-brand">{herdSummary.totalAnimals} Cows</div>
            <div className="text-[9px] text-ink-muted mt-1">Last updated {getRelativeTime(herdState[0]?.updatedAt)}</div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Average Age</div>
            <div className="mt-1 text-lg font-black text-ink-strong">{formatAge(herdSummary.averageAgeMonths)}</div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Milking / Dry</div>
            <div className="mt-1 text-lg font-black text-ink-strong">
              {herdSummary.milkingCount}{' '}
              <span className="text-sm font-bold text-ink-muted">/ {herdSummary.dryCount}</span>
            </div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Latest Calved</div>
            <div className="mt-1 text-sm font-black text-ink-strong">{formatDate(herdSummary.latestCalved)}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-ink-strong font-bold text-sm">
            <Filter size={18} className="text-ink-strong" />
            <span className="leading-none">Organize List</span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-surface/95 px-3 py-2 lg:min-w-[280px]">
              <Search size={16} className="text-ink-muted" />
              <input
                ref={searchInputRef}
                type="search"
                value={herdSearch}
                onChange={(event) => setHerdSearch(event.target.value)}
                placeholder="Search herd... (Cmd+K)"
                className="w-full bg-transparent text-sm font-semibold text-ink-strong outline-none placeholder:text-ink-muted"
                aria-label="Search herd by ID, name, breed, or status"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-surface/95 px-3 py-2">
              <Scale size={16} className="text-ink-strong" />
              <label className="text-xs font-bold uppercase tracking-wider text-ink-strong" htmlFor="herd-sort">
                Sort by
              </label>
              <select
                id="herd-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-sm font-semibold text-ink-strong outline-none"
                aria-label="Sort herd by"
              >
                <option value="age">Age</option>
                <option value="breed">Breed</option>
                <option value="status">Current Status</option>
              </select>
              <ChevronDown size={14} className="text-ink-strong" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'All', count: herdState.length },
                { label: 'Milking', count: herdState.filter((cow) => cow.status === 'Milking').length },
                { label: 'Dry', count: herdState.filter((cow) => cow.status === 'Dry').length },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setStatusFilter(option.label)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                    statusFilter === option.label
                      ? 'border-brand bg-brand text-surface'
                      : 'border-ink/10 bg-surface-raised text-ink-muted hover:border-brand/20 hover:text-brand'
                  }`}
                  aria-pressed={statusFilter === option.label}
                  aria-label={`Filter by ${option.label} status`}
                >
                  {option.label} <span className="ml-1 opacity-80">({option.count})</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleClearFilters}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  hasActiveFilters
                    ? 'border-brand/20 bg-brand/5 text-brand hover:bg-brand/10'
                    : 'border-ink/10 bg-surface-raised text-ink-muted'
                }`}
                aria-label="Clear all active filters"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-raised border-b border-ink/10">
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Ear Tag
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Name
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Breed
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Last Calved
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Age
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Status
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong">
                  Updated
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-strong text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-transparent">
              {isLoading
                ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="transition-colors">
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-4 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
                : visibleHerd.length === 0
                  ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={24} className="text-ink-muted" />
                          <p className="text-sm text-ink-muted font-medium">
                            {herdSearch || statusFilter !== 'All'
                              ? 'No animals match your filters'
                              : 'Your herd is empty. Add your first animal!'}
                          </p>
                          {(herdSearch || statusFilter !== 'All') && (
                            <button
                              type="button"
                              onClick={handleClearFilters}
                              className="text-xs text-brand font-bold hover:underline mt-2"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                  : visibleHerd.map((cow) => (
                    <tr key={cow.id} className="transition-colors hover:bg-surface-raised/80">
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/operations/animal/${cow.id}`}
                          className="font-sans font-black text-brand hover:underline"
                        >
                          {cow.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-ink">{cow.name}</td>
                      <td className="px-3 py-2.5 text-sm text-ink-muted">{cow.breed}</td>
                      <td className="px-3 py-2.5 text-sm text-ink-muted">{formatDate(cow.lastCalved)}</td>
                      <td className="px-3 py-2.5 text-sm text-ink-muted">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-ink-muted" />
                          {formatAge(cow.ageMonths)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(cow.status)}`}
                        >
                          <ShieldCheck size={12} /> {cow.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-ink-muted">
                        <div className="text-[10px]" title={formatDateTime(cow.updatedAt)}>
                          {getRelativeTime(cow.updatedAt)}
                        </div>
                        <div className="text-[9px] text-ink-muted/60">{cow.updatedBy}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/operations/animal/${cow.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-[11px] font-bold text-surface shadow-sm transition-colors hover:bg-brand-dark"
                            aria-label={`View record for ${cow.name}`}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteCow(cow.id, cow.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-2 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50"
                            aria-label={`Delete ${cow.name}`}
                            title={`Delete ${cow.name} from herd`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-ink-muted">
          Showing {visibleHerd.length} of {herdState.length} animals.
        </div>
      </div>

      {/* ── ADD COW MODAL ── */}
      <Modal
        isOpen={isAddOpen}
        onClose={handleCloseModal}
        title="Add New Animal"
        subtitle="Register a new cow to your herd registry"
      >
        <form className="space-y-4" onSubmit={handleAddCow}>
          {/* ID Field */}
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">
              Ear Tag Number *
            </label>
            <input
              type="text"
              className={`input-machined w-full ${formErrors.id ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.id}
              onChange={(e) => {
                setNewCow({ ...newCow, id: e.target.value });
                if (formErrors.id) setFormErrors({ ...formErrors, id: null });
              }}
              placeholder="e.g. C-108"
              aria-label="Ear tag number"
              aria-invalid={!!formErrors.id}
              aria-describedby={formErrors.id ? 'id-error' : undefined}
            />
            {formErrors.id && (
              <p id="id-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.id}
              </p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Name</label>
            <input
              type="text"
              className="input-machined w-full"
              value={newCow.name}
              onChange={(e) => setNewCow({ ...newCow, name: e.target.value })}
              placeholder="Optional (e.g. Luna)"
              aria-label="Animal name"
            />
          </div>

          {/* Breed Field */}
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">
              Breed *
            </label>
            <input
              type="text"
              className={`input-machined w-full ${formErrors.breed ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.breed}
              onChange={(e) => {
                setNewCow({ ...newCow, breed: e.target.value });
                if (formErrors.breed) setFormErrors({ ...formErrors, breed: null });
              }}
              placeholder="e.g. Friesian"
              aria-label="Breed"
              aria-invalid={!!formErrors.breed}
              aria-describedby={formErrors.breed ? 'breed-error' : undefined}
            />
            {formErrors.breed && (
              <p id="breed-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.breed}
              </p>
            )}
          </div>

          {/* DOB Field */}
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Date of Birth</label>
            <input
              type="date"
              className="input-machined w-full"
              value={newCow.dob}
              onChange={(e) => setNewCow({ ...newCow, dob: e.target.value })}
              aria-label="Date of birth"
            />
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-3">
            <input
              id="hasCalved"
              type="checkbox"
              checked={newCow.hasCalved}
              onChange={(e) => setNewCow({ ...newCow, hasCalved: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
              aria-label="Has had a calf before"
            />
            <label htmlFor="hasCalved" className="text-sm font-semibold text-ink-strong cursor-pointer">
              Has had a calf before
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSaving}
              className="btn-command bg-surface-raised text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-command bg-brand text-surface disabled:opacity-50"
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Animal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONFIRMATION DIALOG ── */}
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
