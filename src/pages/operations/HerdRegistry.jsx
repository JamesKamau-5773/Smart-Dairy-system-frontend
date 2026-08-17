import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Scale,
  Search,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Pencil,
  Undo2,
} from 'lucide-react';
import { Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';
import { getApiErrorMessage, herdApi } from '../../lib/backendApi'; 
import { useTenant } from '../../hooks/useTenant';
import {
  formatAge,
  formatDate,
  statusTone,
  hasValidTimestamp,
  normalizeHerdCow,
  getFilteredHerd,
  getHerdSummary,
  isMilkingStatus,
  isDryStatus,
} from '../../lib/herdUtils';

const INITIAL_HERD = [];

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function HerdRegistry() {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  // State
  const [sortBy, setSortBy] = useState('age');
  const [statusFilter, setStatusFilter] = useState('All');
  const [herdSearch, setHerdSearch] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [herdState, setHerdState] = useState(INITIAL_HERD);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editingCow, setEditingCow] = useState(null);
  const [editCow, setEditCow] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    dateOfBirth: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const searchInputRef = useRef(null);
  const confirmation = useConfirmation();

  const { data: herdData, isLoading } = useQuery({
    queryKey: ['herd-registry', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (Array.isArray(herdData)) {
      setHerdState(herdData.map((cow) => normalizeHerdCow(cow)));
    }
  }, [herdData]);

  // Form state
  const [newCow, setNewCow] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    dateOfBirth: '',
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
  const activeFilterCount = [herdSearch.trim(), statusFilter !== 'All'].filter(Boolean).length;
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
      if (event.key === 'Escape' && isEditOpen) {
        handleCloseEditModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddOpen, isEditOpen]);

  // Validation schema
  const validationSchema = {
    tagNumber: [ValidationRules.required, ValidationRules.minLength(3)],
    dateOfBirth: [ValidationRules.required, ValidationRules.pastDate],
  };

  const canonicalizeTagNumber = (value = '') => {
    const normalized = String(value).trim().toUpperCase();
    if (!normalized) return '';
    if (/^C-/.test(normalized)) return normalized;
    return `C-${normalized}`;
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

      const tagNumber = canonicalizeTagNumber(newCow.tagNumber);

      // Client-side check for immediate feedback, backend will enforce uniqueness definitively.
      if (herdState.some((c) => c.id === tagNumber)) {
        setErrorMessage(`Animal with tag ${tagNumber} already exists for this tenant`);
        setShowError(true);
        setIsSaving(false);
        return;
      }

      // Send raw form data; let the backend calculate status and other derived fields.
      const apiPayload = {
        tagNumber: tagNumber,
        name: newCow.name || 'Unnamed',
        breed: newCow.breed || 'Foundation',
        dateOfBirth: newCow.dateOfBirth,
        hasCalved: newCow.hasCalved,
      };

      const savedCowResponse = await herdApi.create(apiPayload);
      const savedCow = normalizeHerdCow(savedCowResponse);

      await queryClient.invalidateQueries({ queryKey: ['herd-registry', tenantId, farmId] });

      // Log audit entry
      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'cow',
          recordId: savedCow.id,
          userName: 'You',
          changes: { name: { before: '', after: savedCow.name } },
          notes: `Added new animal: ${savedCow.name} (${savedCow.id})`,
        })
      );

      setSuccessMessage(`Successfully added ${savedCow.id} — ${savedCow.name}`);
      handleCloseModal();
    } catch (error) {
      console.error('Error adding cow:', error);
      setErrorMessage(getApiErrorMessage(error, 'Failed to add animal. Please try again.'));
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCow = async (cowId, cowName, cowDisplayId = cowId) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Animal?',
      message: `Are you sure you want to remove ${cowName} (${cowDisplayId}) from your herd? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Keep',
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);

      await herdApi.delete(cowId);

      await queryClient.invalidateQueries({ queryKey: ['herd-registry', tenantId, farmId] });

      // Log audit entry
      logToAuditTrail(
        createAuditEntry({
          action: 'delete',
          recordType: 'cow',
          recordId: cowDisplayId,
          userName: 'You',
          notes: `Deleted animal: ${cowName} (${cowDisplayId})`,
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
    setNewCow({ tagNumber: '', name: '', breed: '', dateOfBirth: '', hasCalved: false });
    setFormErrors({});
    setShowError(false);
  };

  const handleOpenEdit = (cow) => {
    setEditingCow(cow);
    setEditCow({
      tagNumber: cow.id ?? '',
      name: cow.name ?? '',
      breed: cow.breed ?? '',
      dateOfBirth: cow.dateOfBirth ?? '',
    });
    setEditFormErrors({});
    setShowError(false);
    setIsEditOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditOpen(false);
    setEditingCow(null);
    setEditCow({ tagNumber: '', name: '', breed: '', dateOfBirth: '' });
    setEditFormErrors({});
  };

  const handleEditCow = async (event) => {
    event.preventDefault();
    setEditFormErrors({});
    setShowError(false);

    const errors = validateForm(editCow, validationSchema);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    const routeId = getCowRouteId(editingCow);
    if (!routeId) {
      setErrorMessage('Failed to resolve animal record id for update.');
      setShowError(true);
      return;
    }

    try {
      setIsEditSaving(true);

      const payload = {
        tagNumber: canonicalizeTagNumber(editCow.tagNumber),
        name: editCow.name.trim() || 'Unnamed',
        breed: editCow.breed.trim() || 'Foundation',
        dateOfBirth: editCow.dateOfBirth,
      };

      const updated = await herdApi.update(routeId, payload);
      const normalizedUpdatedCow = normalizeHerdCow(updated, editingCow ?? {});

      await queryClient.invalidateQueries({ queryKey: ['herd-registry', tenantId, farmId] });

      logToAuditTrail(
        createAuditEntry({
          action: 'update',
          recordType: 'cow',
          recordId: normalizedUpdatedCow.id,
          userName: 'You',
          notes: `Updated animal: ${normalizedUpdatedCow.name} (${normalizedUpdatedCow.id})`,
        })
      );

      setSuccessMessage(`Updated ${normalizedUpdatedCow.id} - ${normalizedUpdatedCow.name}`);
      handleCloseEditModal();
    } catch (error) {
      console.error('Error editing cow:', error);
      setErrorMessage(getApiErrorMessage(error, 'Failed to update animal. Please try again.'));
      setShowError(true);
    } finally {
      setIsEditSaving(false);
    }
  };

  const getCowRouteId = (cow) => {
    const routeId = cow?.recordId ?? cow?.id;
    return String(routeId ?? '').trim();
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
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
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
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
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
            <div
              className="text-[9px] text-ink-muted mt-1"
              title={herdSummary.latestUpdatedAt ? formatDateTime(herdSummary.latestUpdatedAt) : 'Not available'}
            >
              Last updated {herdSummary.latestUpdatedAt ? getRelativeTime(herdSummary.latestUpdatedAt) : 'Not available'}
            </div>
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
        <div className="mb-6 rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-ink-strong font-bold text-sm">
              <Filter size={18} className="text-ink-strong" />
              <span className="leading-none">Organize List</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                {activeFilterCount} active
              </span>
              <button
                type="button"
                onClick={() => setControlsOpen((current) => !current)}
                aria-expanded={controlsOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
              >
                {controlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {controlsOpen ? 'Hide filters' : 'Show filters'}
              </button>
            </div>
          </div>

          {controlsOpen && (
            <div className="flex flex-col gap-3 pt-4 lg:flex-row lg:items-center">
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
                  { label: 'Milking', count: herdState.filter((cow) => isMilkingStatus(cow.status)).length },
                  { label: 'Dry', count: herdState.filter((cow) => isDryStatus(cow.status)).length },
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
          )}
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
                  : visibleHerd.map((cow) => {
                    const routeId = getCowRouteId(cow);

                    return (
                    <tr key={`${cow.id}-${routeId || 'row'}`} className="transition-colors hover:bg-surface-raised/80">
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/operations/animal/${routeId}`}
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
                        {hasValidTimestamp(cow.updatedAt) ? (
                          <>
                            <div className="text-[10px] text-ink" title={formatDateTime(cow.updatedAt)}>
                              {formatDateTime(cow.updatedAt)}
                            </div>
                            <div className="text-[9px] text-ink-muted/60">
                              {getRelativeTime(cow.updatedAt)}{cow.updatedBy ? ` · ${cow.updatedBy}` : ''}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-ink-muted">-</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/operations/animal/${routeId}`}
                            className="btn-command gap-2 px-3 py-2 text-[11px]"
                            aria-label={`View record for ${cow.name}`}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cow)}
                            className="btn-secondary gap-1 px-2 py-2 text-[11px]"
                            aria-label={`Edit ${cow.name}`}
                            title={`Edit ${cow.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCow(routeId, cow.name, cow.id)}
                            className="btn-danger gap-1 px-2 py-2 text-[11px]"
                            aria-label={`Delete ${cow.name}`}
                            title={`Delete ${cow.name} from herd`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
              className={`input-machined w-full ${formErrors.tagNumber ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.tagNumber}
              onChange={(e) => {
                setNewCow({ ...newCow, tagNumber: e.target.value });
                if (formErrors.tagNumber) setFormErrors({ ...formErrors, tagNumber: null });
              }}
              placeholder="e.g. C-108"
              aria-label="Ear tag number"
              aria-invalid={!!formErrors.tagNumber}
              aria-describedby={formErrors.tagNumber ? 'tag-number-error' : undefined}
            />
            {formErrors.tagNumber && (
              <p id="tag-number-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.tagNumber}
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
              Breed
            </label>
            <input
              type="text"
              className="input-machined w-full"
              value={newCow.breed}
              onChange={(e) => setNewCow({ ...newCow, breed: e.target.value })}
              placeholder="Optional (e.g. Friesian)"
              aria-label="Breed"
            />
          </div>

          {/* DOB Field */}
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Date of Birth *</label>
            <input
              type="date"
              className={`input-machined w-full ${formErrors.dateOfBirth ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.dateOfBirth}
              onChange={(e) => {
                setNewCow({ ...newCow, dateOfBirth: e.target.value });
                if (formErrors.dateOfBirth) setFormErrors({ ...formErrors, dateOfBirth: null });
              }}
              aria-label="Date of birth"
              aria-invalid={!!formErrors.dateOfBirth}
              aria-describedby={formErrors.dateOfBirth ? 'date-of-birth-error' : undefined}
            />
            {formErrors.dateOfBirth && (
              <p id="date-of-birth-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.dateOfBirth}
              </p>
            )}
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-command disabled:opacity-50"
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Animal'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={handleCloseEditModal}
        title="Edit Animal"
        subtitle="Update cow details in your herd registry"
      >
        <form className="space-y-4" onSubmit={handleEditCow}>
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">
              Ear Tag Number *
            </label>
            <input
              type="text"
              className={`input-machined w-full ${editFormErrors.tagNumber ? 'border-rose-300 bg-rose-50' : ''}`}
              value={editCow.tagNumber}
              onChange={(e) => {
                setEditCow({ ...editCow, tagNumber: e.target.value });
                if (editFormErrors.tagNumber) setEditFormErrors({ ...editFormErrors, tagNumber: null });
              }}
              placeholder="e.g. C-108"
              aria-label="Ear tag number"
              aria-invalid={!!editFormErrors.tagNumber}
              aria-describedby={editFormErrors.tagNumber ? 'edit-tag-number-error' : undefined}
            />
            {editFormErrors.tagNumber && (
              <p id="edit-tag-number-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {editFormErrors.tagNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Name</label>
            <input
              type="text"
              className="input-machined w-full"
              value={editCow.name}
              onChange={(e) => setEditCow({ ...editCow, name: e.target.value })}
              placeholder="Optional (e.g. Luna)"
              aria-label="Animal name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">
              Breed
            </label>
            <input
              type="text"
              className="input-machined w-full"
              value={editCow.breed}
              onChange={(e) => setEditCow({ ...editCow, breed: e.target.value })}
              placeholder="Optional (e.g. Friesian)"
              aria-label="Breed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Date of Birth *</label>
            <input
              type="date"
              className={`input-machined w-full ${editFormErrors.dateOfBirth ? 'border-rose-300 bg-rose-50' : ''}`}
              value={editCow.dateOfBirth}
              onChange={(e) => {
                setEditCow({ ...editCow, dateOfBirth: e.target.value });
                if (editFormErrors.dateOfBirth) setEditFormErrors({ ...editFormErrors, dateOfBirth: null });
              }}
              aria-label="Date of birth"
              aria-invalid={!!editFormErrors.dateOfBirth}
              aria-describedby={editFormErrors.dateOfBirth ? 'edit-date-of-birth-error' : undefined}
            />
            {editFormErrors.dateOfBirth && (
              <p id="edit-date-of-birth-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} /> {editFormErrors.dateOfBirth}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
            <button
              type="button"
              onClick={handleCloseEditModal}
              disabled={isEditSaving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditSaving}
              className="btn-command disabled:opacity-50"
              aria-busy={isEditSaving}
            >
              {isEditSaving ? 'Saving...' : 'Save Changes'}
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
