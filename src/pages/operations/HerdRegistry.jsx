import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Search, AlertCircle, MoreVertical } from 'lucide-react';
import { Skeleton } from '../../components/ui';
import BaseModal from '../../components/ui/BaseModal';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime } from '../../lib/audit';
import { getApiErrorMessage, herdApi } from '../../lib/backendApi';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { reportError } from '../../lib/telemetry';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { ListLoadNotices, StatValue } from '../../components/ui/ListLoadState';
import CowPhoto from '../../components/ui/CowPhoto';
import { ANIMAL_PHOTO_ACCEPT, compressAnimalPhoto, formatPhotoSize, getAnimalPhotoSourceError, getAnimalPhotoValidationError } from '../../lib/animalPhoto';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { useTenant } from '../../hooks/useTenant';
import { herdCopy, herdStatusLabel } from '../../i18n/herd';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import AnimalAge from '../../components/operations/AnimalAge';
import {
  formatDate,
  statusTone,
  hasValidTimestamp,
  normalizeHerdCow,
  getFilteredHerd,
  getHerdSearchSuggestions,
  getHerdSummary,
  normalizeEarTag,
} from '../../lib/herdUtils';

const statusOptions = ['Calf', 'Heifer', 'Lactating', 'Dry'];
const HERD_FILTERS = { q: '', status: 'All', sort: 'age' };
const HERD_FILTER_VALUES = { status: ['All', 'Milking', 'Dry'], sort: ['age', 'breed', 'status', 'name'] };

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function HerdRegistry() {
  const copy = herdCopy.registry;
  const form = copy.form;
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  // State
  // Table filters live in the address (Back, reload and shared links keep them).
  const { filters: herdFilters, setFilter: setHerdFilter, setFilters: setHerdFilters, hasActiveFilters: hasUrlFilters } = useUrlFilters(HERD_FILTERS, { allowed: HERD_FILTER_VALUES });
  const { sort: sortBy, status: statusFilter, q: herdSearch } = herdFilters;
  const setSortBy = (value) => setHerdFilter('sort', value);
  const setStatusFilter = (value) => setHerdFilter('status', value);
  const setHerdSearch = (value) => setHerdFilter('q', value);
  // Opened when the page loads with filters, so the farmer sees why the list is short.
  const [controlsOpen, setControlsOpen] = useState(hasUrlFilters);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  // Mirror every banner to the global Toaster so feedback is guaranteed to render
  // above any open modal (the inline banners use z-[60], below some overlays).
  const notifySuccess = (msg) => { setSuccessMessage(msg); toast.success(msg); };
  const notifyError = (msg) => { setErrorMessage(msg); setShowError(true); toast.error(msg); };
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editingCow, setEditingCow] = useState(null);
  const [editCow, setEditCow] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    dateOfBirth: '',
    current_status: '', // Will be pre-filled from cow.status
    sire_name: '',
    dam_id: '',
    birth_weight_kg: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [isPhotoPreparing, setIsPhotoPreparing] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(null);
  const [photoSourceSize, setPhotoSourceSize] = useState(null);
  const searchInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const confirmation = useConfirmation();

  // The herd is rendered straight from the backend's list (shared cache with other pages);
  // the dam dropdown uses the same list instead of fetching it again.
  const herdQuery = useQuery({
    queryKey: ['herd', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: !!tenantId && !!farmId,
  });
  const herdData = herdQuery.data;
  const herdLoadState = getListLoadState(herdQuery);
  const isLoading = herdLoadState === 'loading';
  const herdState = useMemo(
    () => (Array.isArray(herdData) ? herdData.map((cow) => normalizeHerdCow(cow)) : []),
    [herdData],
  );
  const herdOptions = useMemo(
    () => (Array.isArray(herdData) ? herdData.map((cow) => ({ value: cow.id, label: formatCowIdentity(cow) })) : []),
    [herdData],
  );
  const loadingHerdOptions = isLoading;
  const herdOptionsFailed = herdLoadState === 'error' || herdLoadState === 'offline';

  // Counts for the whole farm, from the backend (the list above is capped at one page).
  const herdSummaryQuery = useQuery({
    queryKey: ['herd', tenantId, farmId, 'summary'],
    queryFn: () => herdApi.summary(),
    enabled: !!tenantId && !!farmId,
  });
  const summaryLoadState = getListLoadState(herdSummaryQuery);
  const backendSummary = herdSummaryQuery.data;

  const [newCow, setNewCow] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    dateOfBirth: '',
    hasCalved: false,
    current_status: 'Calf', // Default for new animal
    sire_name: '',
    dam_id: '',
  });

  // Derived data
  const visibleHerd = getFilteredHerd(herdState, statusFilter, herdSearch).sort((a, b) => {
    if (sortBy === 'breed') return a.breed.localeCompare(b.breed) || a.id.localeCompare(b.id);
    if (sortBy === 'status') return a.status.localeCompare(b.status) || a.id.localeCompare(b.id);
    if (sortBy === 'name') return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    // Unknown ages (null) sort last, never as 0.
    if (a.ageMonths === null || b.ageMonths === null) return (a.ageMonths === null) - (b.ageMonths === null) || a.id.localeCompare(b.id);
    return a.ageMonths - b.ageMonths;
  });

  const hasActiveFilters = statusFilter !== 'All' || herdSearch.trim() !== '';
  const activeFilterCount = [herdSearch.trim(), statusFilter !== 'All'].filter(Boolean).length;
  const herdSummary = {
    totalAnimals: backendSummary?.totalCount ?? null,
    milkingCount: backendSummary?.milkingCount ?? null,
    dryCount: backendSummary?.dryCount ?? null,
    averageAgeMonths: backendSummary?.averageAgeMonths == null ? null : Math.round(backendSummary.averageAgeMonths),
    latestCalved: backendSummary?.latestCalved ?? null,
    // TODO(BR-011): the backend summary should include the latest update; until then it is
    // read from the rows on this page.
    latestUpdatedAt: getHerdSummary(herdState).latestUpdatedAt,
  };
  const countText = (value) => (value === null ? '—' : value);

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

  const refreshHerdViews = async (cowId) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: ['herd', tenantId, farmId] }),
    ];

    if (cowId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ['animal-passport', tenantId, farmId, String(cowId)] })
      );
    }

    await Promise.all(invalidations);
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

      const tagNumber = normalizeEarTag(newCow.tagNumber);

      // Client-side check for immediate feedback, backend will enforce uniqueness definitively.
      if (herdState.some((c) => c.id === tagNumber)) {
        setErrorMessage(copy.tagExists(tagNumber));
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
        // New fields
        current_status: newCow.current_status,
        sire_name: newCow.sire_name,
        dam_id: newCow.dam_id,
      };

      const savedCowResponse = await herdApi.create(apiPayload);
      const savedCow = normalizeHerdCow(savedCowResponse);

      await refreshHerdViews(savedCow.recordId);

      notifySuccess(copy.added(formatCowIdentity({ name: savedCow.name, earTag: savedCow.id })));
      handleCloseModal();
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.add' });
      setErrorMessage(getApiErrorMessage(error, copy.addFailed));
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCow = async (cowId, cowName, cowDisplayId = cowId) => {
    const cowLabel = formatCowIdentity({ name: cowName, earTag: cowDisplayId });
    const confirmed = await confirmation.confirm({
      title: copy.deleteTitle(cowName || cowDisplayId),
      message: copy.deleteMessage(cowLabel),
      type: 'danger',
      confirmText: copy.deleteConfirm,
      cancelText: copy.deleteKeep,
      // A cow carries milk, breeding and health records: make the farmer type her tag.
      requireText: String(cowDisplayId),
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);

      await herdApi.delete(cowId);

      await refreshHerdViews(cowId);

      notifySuccess(copy.removed(cowName));
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.delete' });
      notifyError(offlineFailureMessage(error, copy.notDeleted(cowName || cowDisplayId))
        ?? getApiErrorMessage(error, copy.deleteFailed(cowName || cowDisplayId)));
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

  const handleOpenEdit = async (cow) => {
    const routeId = getCowRouteId(cow);
    if (!routeId) {
      notifyError(copy.resolveEdit);
      return;
    }

    try {
      const canonicalCow = normalizeHerdCow(await herdApi.get(routeId), cow);

      setEditingCow(canonicalCow);
      setEditCow({
        tagNumber: canonicalCow.id,
        name: canonicalCow.name,
        breed: canonicalCow.breed,
        dateOfBirth: canonicalCow.dateOfBirth,
        current_status: canonicalCow.status,
        sire_name: canonicalCow.sire_name,
        dam_id: canonicalCow.dam_id,
        birth_weight_kg: canonicalCow.birth_weight_kg,
      });
      setEditFormErrors({});
      setEditPhotoFile(null);
      setShowError(false);
      setIsEditOpen(true);
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.loadForEdit' });
      notifyError(getApiErrorMessage(error, copy.loadEditFailed));
    }
  };
  
  const handleCloseEditModal = () => {
    setIsEditOpen(false);
    setEditingCow(null);
    setEditCow({ tagNumber: '', name: '', breed: '', dateOfBirth: '' });
    setEditPhotoFile(null);
    setPhotoSourceSize(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    setEditFormErrors({});
  };

  const handlePhotoSelection = async (event) => {
    const input = event.target;
    const sourceFile = input.files?.[0] ?? null;
    const rejectPhoto = (message) => {
      setEditPhotoFile(null);
      setPhotoSourceSize(null);
      input.value = '';
      notifyError(message);
    };

    const sourceError = getAnimalPhotoSourceError(sourceFile);
    if (sourceError) {
      rejectPhoto(sourceError);
      return;
    }

    // Shrink on the phone first so farmers don't spend mobile data on full-size camera photos.
    setIsPhotoPreparing(true);
    try {
      const photoFile = await compressAnimalPhoto(sourceFile);
      const validationError = getAnimalPhotoValidationError(photoFile);
      if (validationError) {
        rejectPhoto(validationError);
        return;
      }
      setEditPhotoFile(photoFile);
      setPhotoSourceSize(sourceFile.size);
    } finally {
      setIsPhotoPreparing(false);
    }
  };

  const handleUploadPhoto = async () => {
    const validationError = getAnimalPhotoValidationError(editPhotoFile);
    if (validationError) {
      notifyError(validationError);
      return;
    }

    const routeId = getCowRouteId(editingCow);
    if (!routeId) {
      notifyError(copy.resolvePhoto);
      return;
    }

    try {
      setIsPhotoSaving(true);
      setPhotoUploadProgress(0);
      const savedCow = normalizeHerdCow(await herdApi.uploadPhoto(routeId, editPhotoFile, { onProgress: setPhotoUploadProgress }), editingCow);
      setEditingCow(savedCow);
      setEditPhotoFile(null);
      setPhotoSourceSize(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      await refreshHerdViews(routeId);
      notifySuccess(copy.photoUpdated(savedCow.name));
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.uploadPhoto' });
      notifyError(getApiErrorMessage(error, copy.photoUploadFailed));
    } finally {
      setIsPhotoSaving(false);
      setPhotoUploadProgress(null);
    }
  };

  const handleDeletePhoto = async () => {
    const routeId = getCowRouteId(editingCow);
    if (!routeId) {
      notifyError(copy.resolvePhotoRemoval);
      return;
    }

    const confirmed = await confirmation.confirm({
      title: copy.removePhotoTitle,
      message: copy.removePhotoMessage(editingCow.name),
      type: 'danger',
      confirmText: copy.removePhotoConfirm,
      cancelText: copy.removePhotoKeep,
    });
    if (!confirmed) return;

    try {
      setIsPhotoSaving(true);
      confirmation.setLoading(true);
      const savedCow = normalizeHerdCow(await herdApi.deletePhoto(routeId), editingCow);
      setEditingCow(savedCow);
      setEditPhotoFile(null);
      setPhotoSourceSize(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      await refreshHerdViews(routeId);
      notifySuccess(copy.photoRemoved(savedCow.name));
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.removePhoto' });
      notifyError(getApiErrorMessage(error, copy.photoRemoveFailed));
    } finally {
      setIsPhotoSaving(false);
      confirmation.setLoading(false);
      confirmation.close();
    }
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
      setErrorMessage(copy.resolveUpdate);
      setShowError(true);
      return;
    }

    try {
      setIsEditSaving(true);

      const payload = {
        tagNumber: normalizeEarTag(editCow.tagNumber),
        name: editCow.name.trim() || 'Unnamed',
        breed: editCow.breed.trim() || 'Foundation',
        dateOfBirth: editCow.dateOfBirth,
        // New fields
        current_status: editCow.current_status,
        sire_name: editCow.sire_name,
        dam_id: editCow.dam_id,
        birth_weight_kg: editCow.birth_weight_kg,
      };

      const updated = await herdApi.update(routeId, payload);
      const normalizedUpdatedCow = normalizeHerdCow(updated, editingCow ?? {});

      await refreshHerdViews(routeId);

      notifySuccess(copy.updated(formatCowIdentity({ name: normalizedUpdatedCow.name, earTag: normalizedUpdatedCow.id })));
      handleCloseEditModal();
    } catch (error) {
      reportError(error, { where: 'HerdRegistry.edit' });
      notifyError(getApiErrorMessage(error, copy.updateFailed));
    } finally {
      setIsEditSaving(false);
    }
  };

  const getCowRouteId = (cow) => {
    const routeId = cow?.recordId ?? cow?.id;
    return String(routeId ?? '').trim();
  };

  const handleClearFilters = () => {
    setHerdFilters({ status: 'All', q: '' });
  };

  // Typo-tolerant "Did you mean…" when a search finds nothing (e.g. "Nema" → Neema, "KE12" → KE-012).
  const herdSuggestions = herdSearch.trim() && visibleHerd.length === 0 ? getHerdSearchSuggestions(herdState, herdSearch) : [];
  const emptyHerdContent = (
    <div className="flex flex-col items-center gap-2">
      <p className="text-body text-ink-muted">
        {hasActiveFilters ? copy.noMatches : copy.empty}
      </p>
      {herdSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-body">
          <span className="text-ink-muted">{copy.didYouMean}</span>
          {herdSuggestions.map((cow) => (
            <button
              key={cow.recordId || cow.id}
              type="button"
              onClick={() => setHerdSearch(cow.name && cow.name !== 'Unnamed' ? cow.name : cow.id)}
              className="rounded-full border border-brand/30 bg-brand-50 px-3 py-1 text-control text-brand hover:bg-brand-100"
            >
              {cow.name && cow.name !== 'Unnamed' ? `${cow.name} · ${cow.id}` : cow.id}
            </button>
          ))}
        </div>
      )}
      {hasActiveFilters ? (
        <button type="button" onClick={handleClearFilters} className="mt-1 text-control text-brand hover:underline">
          {copy.clearFilters}
        </button>
      ) : (
        <button type="button" onClick={() => setIsAddOpen(true)} className="btn-command mt-2 inline-flex items-center">

      {copy.addFirst}
        </button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-reveal space-y-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="m-0 text-page-title text-brand">
            {copy.titleStart} <span className="text-ink-muted">{copy.titleEnd}</span>
          </h1>
          <p className="mt-2 text-body text-ink-muted">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:min-w-[26rem] md:shrink-0">
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-label text-ink-muted">{copy.totalAnimals}</div>
            <div className="text-stat-value text-ink-strong">
              <StatValue state={summaryLoadState} label={copy.statLabel}>{countText(herdSummary.totalAnimals)}</StatValue>
            </div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-label text-ink-muted">{copy.milking}</div>
            <div className="text-stat-value text-ink-strong">
              <StatValue state={summaryLoadState} label={copy.statLabel}>{countText(herdSummary.milkingCount)}</StatValue>
            </div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-label text-ink-muted">{copy.dry}</div>
            <div className="text-stat-value text-ink-strong">
              <StatValue state={summaryLoadState} label={copy.statLabel}>{countText(herdSummary.dryCount)}</StatValue>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-command flex shrink-0 items-center gap-2 whitespace-nowrap"
            aria-label={copy.addCowLabel}
          >
            {copy.addCow}
          </button>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {showError && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner
            type="error"
            title={copy.error}
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
            title={copy.success}
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
            <div className="text-label text-ink-muted">{copy.summary}</div>
            <div className="mt-1 text-stat-value text-brand">{copy.cowCount(countText(herdSummary.totalAnimals))}</div>
            <div
              className="text-meta text-ink-muted mt-1"
              title={herdSummary.latestUpdatedAt ? formatDateTime(herdSummary.latestUpdatedAt) : copy.notAvailable}
            >
              {copy.lastUpdated(herdSummary.latestUpdatedAt ? getRelativeTime(herdSummary.latestUpdatedAt) : copy.notAvailable)}
            </div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-label text-ink-muted">{copy.averageAge}</div>
            <div className="mt-1 text-stat-value text-ink-strong"><AnimalAge months={herdSummary.averageAgeMonths} /></div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-label text-ink-muted">{copy.milkingDry}</div>
            <div className="mt-1 text-stat-value text-ink-strong">
              {countText(herdSummary.milkingCount)}{' '}
              <span className="text-body-strong text-ink-muted">/ {countText(herdSummary.dryCount)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-raised px-4 py-3">
            <div className="text-label text-ink-muted">{copy.latestCalved}</div>
            <div className="mt-1 text-body-strong text-ink-strong">{formatDate(herdSummary.latestCalved)}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 rounded-2xl border border-ink/10 bg-surface/90 p-4 ">
          <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-ink-strong text-body-strong">
              <span>{copy.organize}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-badge text-ink-muted">
                {copy.activeFilters(activeFilterCount)}
              </span>
              <button
                type="button"
                onClick={() => setControlsOpen((current) => !current)}
                aria-expanded={controlsOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-control text-ink transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
              >
                {controlsOpen ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                {controlsOpen ? copy.hideFilters : copy.showFilters}
              </button>
            </div>
          </div>

          {controlsOpen && (
            <div className="flex flex-col gap-3 pt-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-surface/95 px-3 py-2 lg:min-w-[280px]">
                <Search size={16} className="text-ink-muted" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={herdSearch}
                  onChange={(event) => setHerdSearch(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full bg-transparent text-control text-ink-strong outline-none placeholder:text-ink-muted"
                  aria-label={copy.searchLabel}
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-surface/95 px-3 py-2">
                <label className="text-field-label text-ink-strong" htmlFor="herd-sort">
                  {copy.sortBy}
                </label>
                <select
                  id="herd-sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="bg-transparent text-control text-ink-strong outline-none"
                  aria-label={copy.sortLabel}
                >
                  <option value="age">{copy.sort.age}</option>
                  <option value="breed">{copy.sort.breed}</option>
                  <option value="status">{copy.sort.status}</option>
                </select>
                <ChevronDown size={14} className="text-ink-strong" aria-hidden="true" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: 'All', count: countText(herdSummary.totalAnimals) },
                  { value: 'Milking', count: countText(herdSummary.milkingCount) },
                  { value: 'Dry', count: countText(herdSummary.dryCount) },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-lg border px-3 py-2 text-control transition-colors ${
                      statusFilter === option.value
                        ? 'border-brand bg-brand text-surface'
                        : 'border-ink/10 bg-surface-raised text-ink-muted hover:border-brand/20 hover:text-brand'
                    }`}
                    aria-pressed={statusFilter === option.value}
                    aria-label={copy.filterBy(copy.filters[option.value])}
                  >
                    {copy.filters[option.value]} <span className="ml-1 opacity-80">({option.count})</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`rounded-lg border px-3 py-2 text-control transition-colors ${
                    hasActiveFilters
                      ? 'border-brand/20 bg-brand/5 text-brand hover:bg-brand/10'
                      : 'border-ink/10 bg-surface-raised text-ink-muted'
                  }`}
                  aria-label={copy.clearFiltersLabel}
                >
                  {copy.clearFilters}
                </button>
              </div>
            </div>
          )}
        </div>

        <ListLoadNotices state={herdLoadState} label={copy.listLabel} error={herdQuery.error} onRetry={herdQuery.refetch} />

        {/* Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-raised border-b border-ink/10">
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.earTag}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.name}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.breed}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.lastCalved}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.age}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.status}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong">
                  {copy.columns.updated}
                </th>
                <th className="px-3 py-2 text-label text-ink-strong text-right">
                  {copy.columns.actions}
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
                : !hasRowsToShow(herdLoadState) ? null : visibleHerd.length === 0
                  ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center">{emptyHerdContent}</td>
                    </tr>
                  )
                  : visibleHerd.map((cow) => {
                    const routeId = getCowRouteId(cow);

                    return (
                    <tr key={`${cow.id}-${routeId || 'row'}`} className="transition-colors hover:bg-surface-raised/80">
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/operations/animal/${routeId}`}
                          className="text-body-strong text-brand hover:underline"
                        >
                          {cow.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body-strong text-ink">{cow.name}</td>
                      <td className="px-3 py-2.5 text-body text-ink-muted">{cow.breed}</td>
                      <td className="px-3 py-2.5 text-body text-ink-muted">{formatDate(cow.lastCalved)}</td>
                      <td className="px-3 py-2.5 text-body text-ink-muted">
                        <AnimalAge months={cow.ageMonths} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-badge ${statusTone(cow.status)}`}
                        >
                          {herdStatusLabel(cow.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-meta text-ink-muted">
                        {hasValidTimestamp(cow.updatedAt) ? (
                          <>
                            <div className="text-meta text-ink" title={formatDateTime(cow.updatedAt)}>
                              {formatDateTime(cow.updatedAt)}
                            </div>
                            <div className="text-meta text-ink-muted/60">
                              {getRelativeTime(cow.updatedAt)}{cow.updatedBy ? ` · ${cow.updatedBy}` : ''}
                            </div>
                          </>
                        ) : (
                          <div className="text-meta text-ink-muted">-</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/operations/animal/${routeId}`}
                            className="btn-command gap-2 px-3 py-2 text-control"
                            aria-label={copy.viewRecordFor(cow.name)}
                          >
                            {copy.view}
                          </Link>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-700" aria-label={copy.actionsFor(cow.name)}><MoreVertical size={16} aria-hidden="true" /></button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-40 p-1.5">
                              <button type="button" onClick={() => handleOpenEdit(cow)} className="flex w-full items-center rounded-md px-3 py-2 text-left text-control text-ink-900 hover:bg-brand-50">
            {copy.edit}</button>
                              <button type="button" onClick={() => handleDeleteCow(routeId, cow.name, cow.id)} className="flex w-full items-center rounded-md px-3 py-2 text-left text-control text-danger hover:bg-danger/10">
            {copy.delete}</button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {isLoading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 w-full" />)
            : !hasRowsToShow(herdLoadState) ? null
            : visibleHerd.length === 0 ? <div className="p-5 text-center">{emptyHerdContent}</div>
              : visibleHerd.map((cow) => {
                const routeId = getCowRouteId(cow);
                return (
                  <article key={`${cow.id}-${routeId || 'card'}`} className="min-w-0 rounded-xl border border-ink/10 bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><Link to={`/operations/animal/${routeId}`} className="text-body-strong text-brand">{cow.name || cow.id}</Link><p className="mt-1 text-meta text-ink-muted">{copy.tag(cow.id, cow.breed)}</p></div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-badge ${statusTone(cow.status)}`}>{herdStatusLabel(cow.status)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-raised p-3 text-meta">
                      <div><p className="text-ink-muted">{copy.lastCalvedShort}</p><p className="mt-1 text-body-strong text-ink">{formatDate(cow.lastCalved)}</p></div>
                      <div><p className="text-ink-muted">{copy.ageShort}</p><p className="mt-1 text-body-strong text-ink"><AnimalAge months={cow.ageMonths} /></p></div>
                      <div className="col-span-2"><p className="text-ink-muted">{copy.updatedShort}</p><p className="mt-1 text-body-strong text-ink">{hasValidTimestamp(cow.updatedAt) ? `${getRelativeTime(cow.updatedAt)}${cow.updatedBy ? ` · ${cow.updatedBy}` : ''}` : '—'}</p></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/operations/animal/${routeId}`} className="flex-1 rounded-lg bg-brand px-3 py-2 text-center text-meta text-white">{copy.viewRecord}</Link>
                      <button type="button" onClick={() => handleOpenEdit(cow)} className="rounded-lg border border-brand/20 px-3 py-2 text-control text-brand">{copy.edit}</button>
                      <button type="button" onClick={() => handleDeleteCow(routeId, cow.name, cow.id)} className="rounded-lg border border-brand/20 px-3 py-2 text-control text-brand">{copy.delete}</button>
                    </div>
                  </article>
                );
              })}
        </div>

        <div className="mt-4 text-meta text-ink-muted">
          {copy.showing(visibleHerd.length, countText(herdSummary.totalAnimals))}
        </div>
      </div>

      {/* ── ADD COW MODAL ── */}
      <BaseModal closeOnBackdrop
        isOpen={isAddOpen}
        onClose={handleCloseModal}
        title={form.addTitle}
        subtitle={form.addSubtitle}
      >
        <form className="space-y-4" onSubmit={handleAddCow}>
          {/* ID Field */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">
              {form.earTag}
            </label>
            <input
              type="text"
              className={`input-machined w-full ${formErrors.tagNumber ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.tagNumber}
              onChange={(e) => {
                setNewCow({ ...newCow, tagNumber: e.target.value });
                if (formErrors.tagNumber) setFormErrors({ ...formErrors, tagNumber: null });
              }}
              placeholder={form.earTagPlaceholder}
              aria-label={form.earTagLabel}
              aria-invalid={!!formErrors.tagNumber}
              aria-describedby={formErrors.tagNumber ? 'tag-number-error' : undefined}
            />
            {formErrors.tagNumber && (
              <p id="tag-number-error" className="mt-1 text-meta text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} aria-hidden="true" /> {formErrors.tagNumber}
              </p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.name}</label>
            <input
              type="text"
              className="input-machined w-full"
              value={newCow.name}
              onChange={(e) => setNewCow({ ...newCow, name: e.target.value })}
              placeholder={form.namePlaceholder}
              aria-label={form.nameLabel}
            />
          </div>

          {/* Breed Field */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">
              {form.breed}
            </label>
            <input
              type="text"
              className="input-machined w-full"
              value={newCow.breed}
              onChange={(e) => setNewCow({ ...newCow, breed: e.target.value })}
              placeholder={form.breedPlaceholder}
              aria-label={form.breed}
            />
          </div>

          {/* DOB Field */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.dateOfBirth}</label>
            <input
              type="date"
              className={`input-machined w-full ${formErrors.dateOfBirth ? 'border-rose-300 bg-rose-50' : ''}`}
              value={newCow.dateOfBirth}
              onChange={(e) => {
                setNewCow({ ...newCow, dateOfBirth: e.target.value });
                if (formErrors.dateOfBirth) setFormErrors({ ...formErrors, dateOfBirth: null });
              }}
              aria-label={form.dateOfBirthLabel}
              aria-invalid={!!formErrors.dateOfBirth}
              aria-describedby={formErrors.dateOfBirth ? 'date-of-birth-error' : undefined}
            />
            {formErrors.dateOfBirth && (
              <p id="date-of-birth-error" className="mt-1 text-meta text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} aria-hidden="true" /> {formErrors.dateOfBirth}
              </p>
            )}
          </div>

          {/* NEW FIELD: Current Status */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.status}</label>
            <select
              className="input-machined w-full"
              value={newCow.current_status}
              onChange={(e) => setNewCow({ ...newCow, current_status: e.target.value })}
              aria-label={form.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {herdStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/* NEW FIELD: Sire Name */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.sire}</label>
            <input
              type="text"
              className="input-machined w-full"
              value={newCow.sire_name}
              onChange={(e) => setNewCow({ ...newCow, sire_name: e.target.value })}
              placeholder={form.sirePlaceholder}
              aria-label={form.sireLabel}
            />
          </div>

          {/* NEW FIELD: Dam (Mother) */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.dam}</label>
            {herdOptionsFailed && <p role="status" className="mb-1 text-meta text-ink-muted">{form.damLoadFailed}</p>}
            {loadingHerdOptions ? (
              <p className="text-body text-ink-muted">{form.damLoading}</p>
            ) : (
              <select
                className="input-machined w-full"
                value={newCow.dam_id}
                onChange={(e) => setNewCow({ ...newCow, dam_id: e.target.value })}
                aria-label={form.dam}
              >
                <option value="">{form.damNone}</option>
                {herdOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {/*
              // For a searchable dropdown like react-select, you would integrate it here:
              // import Select from 'react-select';
              // <Select
              //   options={herdOptions}
              //   value={herdOptions.find(option => option.value === newCow.dam_id)}
              //   onChange={(selectedOption) => setNewCow({ ...newCow, dam_id: selectedOption ? selectedOption.value : '' })}
              //   placeholder="Search or select a Dam (Optional)"
              //   isClearable
              // />
            */}
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-3">
            <input
              id="hasCalved"
              type="checkbox"
              checked={newCow.hasCalved}
              onChange={(e) => setNewCow({ ...newCow, hasCalved: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
              aria-label={form.hasCalved}
            />
            <label htmlFor="hasCalved" className="text-field-label text-ink-strong cursor-pointer">
              {form.hasCalved}
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
              {form.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-command disabled:opacity-50"
              aria-busy={isSaving}
            >
              {isSaving ? form.saving : form.saveAnimal}
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal closeOnBackdrop
        isOpen={isEditOpen}
        onClose={handleCloseEditModal}
        title={form.editTitle}
        subtitle={form.editSubtitle}
      >
        <form className="space-y-4" onSubmit={handleEditCow}>
          <div className="rounded-lg border border-ink/10 bg-surface-raised p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-surface text-brand">
                <CowPhoto
                  src={editingCow?.photoUrl}
                  alt={form.photoAlt(editingCow?.name)}
                  size={80}
                  fallback={<span className="text-meta text-ink-muted">No photo</span>}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-field-label text-ink-muted" htmlFor="edit-animal-photo">
                  {form.photo}
                </label>
                <input
                  ref={photoInputRef}
                  id="edit-animal-photo"
                  type="file"
                  accept={ANIMAL_PHOTO_ACCEPT}
                  onChange={handlePhotoSelection}
                  disabled={isPhotoSaving || isPhotoPreparing}
                  className="block w-full text-control text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:text-control file:text-brand hover:file:bg-brand/15"
                />
                <p className="mt-1 truncate text-meta text-ink-muted" aria-live="polite">
                  {isPhotoPreparing
                    ? form.photoShrinking
                    : editPhotoFile
                      ? `${editPhotoFile.name} · ${formatPhotoSize(editPhotoFile.size)}${photoSourceSize && photoSourceSize > editPhotoFile.size ? form.photoFrom(formatPhotoSize(photoSourceSize)) : ''}`
                      : form.photoHint}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
              {editingCow?.photoUrl && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={isPhotoSaving}
                  className="btn-secondary inline-flex items-center text-danger disabled:opacity-50"
                >

      {form.removePhoto}
                </button>
              )}
              <button
                type="button"
                onClick={handleUploadPhoto}
                disabled={!editPhotoFile || isPhotoSaving || isPhotoPreparing}
                className="btn-command inline-flex items-center disabled:opacity-50"
                aria-busy={isPhotoSaving}
              >
                {isPhotoSaving
                  ? form.uploading(photoUploadProgress)
                  : editingCow?.photoUrl ? form.replacePhoto : form.uploadPhoto}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-field-label text-ink-muted mb-1">
              {form.earTag}
            </label>
            <input
              type="text"
              className={`input-machined w-full ${editFormErrors.tagNumber ? 'border-rose-300 bg-rose-50' : ''}`}
              value={editCow.tagNumber}
              onChange={(e) => {
                setEditCow({ ...editCow, tagNumber: e.target.value });
                if (editFormErrors.tagNumber) setEditFormErrors({ ...editFormErrors, tagNumber: null });
              }}
              placeholder={form.earTagPlaceholder}
              aria-label={form.earTagLabel}
              aria-invalid={!!editFormErrors.tagNumber}
              aria-describedby={editFormErrors.tagNumber ? 'edit-tag-number-error' : undefined}
            />
            {editFormErrors.tagNumber && (
              <p id="edit-tag-number-error" className="mt-1 text-meta text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} aria-hidden="true" /> {editFormErrors.tagNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.name}</label>
            <input
              type="text"
              className="input-machined w-full"
              value={editCow.name}
              onChange={(e) => setEditCow({ ...editCow, name: e.target.value })}
              placeholder={form.namePlaceholder}
              aria-label={form.nameLabel}
            />
          </div>

          <div>
            <label className="block text-field-label text-ink-muted mb-1">
              {form.breed}
            </label>
            <input
              type="text"
              className="input-machined w-full"
              value={editCow.breed}
              onChange={(e) => setEditCow({ ...editCow, breed: e.target.value })}
              placeholder={form.breedPlaceholder}
              aria-label={form.breed}
            />
          </div>

          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.dateOfBirth}</label>
            <input
              type="date"
              className={`input-machined w-full ${editFormErrors.dateOfBirth ? 'border-rose-300 bg-rose-50' : ''}`}
              value={editCow.dateOfBirth}
              onChange={(e) => {
                setEditCow({ ...editCow, dateOfBirth: e.target.value });
                if (editFormErrors.dateOfBirth) setEditFormErrors({ ...editFormErrors, dateOfBirth: null });
              }}
              aria-label={form.dateOfBirthLabel}
              aria-invalid={!!editFormErrors.dateOfBirth}
              aria-describedby={editFormErrors.dateOfBirth ? 'edit-date-of-birth-error' : undefined}
            />
            {editFormErrors.dateOfBirth && (
              <p id="edit-date-of-birth-error" className="mt-1 text-meta text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} aria-hidden="true" /> {editFormErrors.dateOfBirth}
              </p>
            )}
          </div>

          {/* NEW FIELD: Current Status */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.status}</label>
            <select
              className="input-machined w-full"
              value={editCow.current_status}
              onChange={(e) => setEditCow({ ...editCow, current_status: e.target.value })}
              aria-label={form.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {herdStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.birthWeight}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-machined w-full"
              value={editCow.birth_weight_kg}
              onChange={(e) => setEditCow({ ...editCow, birth_weight_kg: e.target.value })}
              placeholder={form.birthWeightPlaceholder}
              aria-label={form.birthWeightLabel}
            />
          </div>

          {/* NEW FIELD: Sire Name */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.sire}</label>
            <input
              type="text"
              className="input-machined w-full"
              value={editCow.sire_name}
              onChange={(e) => setEditCow({ ...editCow, sire_name: e.target.value })}
              placeholder={form.sirePlaceholder}
              aria-label={form.sireLabel}
            />
          </div>

          {/* NEW FIELD: Dam (Mother) */}
          <div>
            <label className="block text-field-label text-ink-muted mb-1">{form.dam}</label>
            {herdOptionsFailed && <p role="status" className="mb-1 text-meta text-ink-muted">{form.damLoadFailed}</p>}
            {loadingHerdOptions ? (
              <p className="text-body text-ink-muted">{form.damLoading}</p>
            ) : (
              <select
                className="input-machined w-full"
                value={editCow.dam_id}
                onChange={(e) => setEditCow({ ...editCow, dam_id: e.target.value })}
                aria-label={form.dam}
              >
                <option value="">{form.damNone}</option>
                {herdOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {/*
              // For a searchable dropdown like react-select, you would integrate it here:
              // import Select from 'react-select';
              // <Select
              //   options={herdOptions}
              //   value={herdOptions.find(option => option.value === editCow.dam_id)}
              //   onChange={(selectedOption) => setEditCow({ ...editCow, dam_id: selectedOption ? selectedOption.value : '' })}
              //   placeholder="Search or select a Dam (Optional)"
              //   isClearable
              // />
            */}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
            <button
              type="button"
              onClick={handleCloseEditModal}
              disabled={isEditSaving || isPhotoSaving}
              className="btn-secondary"
            >
              {form.cancel}
            </button>
            <button
              type="submit"
              disabled={isEditSaving || isPhotoSaving}
              className="btn-command disabled:opacity-50"
              aria-busy={isEditSaving}
            >
              {isEditSaving ? form.saving : form.saveChanges}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* ── CONFIRMATION DIALOG ── */}
      <Confirmation {...confirmation} />
    </div>
  );
}
