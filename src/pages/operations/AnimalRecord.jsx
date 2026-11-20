import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Skeleton } from '../../components/ui';
import AlertBanner from '../../components/ui/AlertBanner';
import BaseModal from '../../components/ui/BaseModal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime } from '../../lib/audit';
import {
  normalizeAnimal,
  normalizeTimelineResponse,
  normalizeTimelineEvent,
  getTimelineTheme,
} from '../../lib/animalUtils';
import {
  getAnimalActionValidationSchema,
  buildHealthLogPayload,
  buildBreedingLogPayload,
  buildCalvingEventPayload,
  buildGeneralEventPayload,
} from '../../lib/animalActionLog';
import LABELS from '../../lib/labels';
import { animalsApi, medicalApi, breedingApi, getApiErrorMessage } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import { formatCowIdentity } from '../../lib/cowIdentity';
import cowAvatar from '../../assets/cow-avatar.svg';
import AnimalSummaryCards from '../../components/operations/animalRecord/AnimalSummaryCards';
import AnimalTimelineSection from '../../components/operations/animalRecord/AnimalTimelineSection';
import AnimalNutritionPlanner from '../../components/operations/animalRecord/AnimalNutritionPlanner';
import { reportError } from '../../lib/telemetry';
import { herdCopy } from '../../i18n/herd';
import { healthCopy } from '../../i18n/health';
import { breedingCopy } from '../../i18n/breeding';
export default function AnimalPassport() {
  const copy = herdCopy.record;
  const form = copy.form;
  const service = breedingCopy.service;
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('timeline');
  const { id } = useParams();
  const location = useLocation();
  const openCalvingForm = new URLSearchParams(location.search).get('action') === 'calving';
  const [timelinePage, setTimelinePage] = useState(1);
  const timelinePerPage = 20;

  const { data: animalData, isLoading } = useQuery({
    queryKey: ['animal-passport', tenantId, farmId, id],
    queryFn: () => animalsApi.get(id),
    enabled: !!tenantId && !!id,
  });

  // The backend mirrors medical/breeding writes into this same table, so it's
  // the single source of truth for the timeline — no client-side merging needed.
  const { data: timelineResponse, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['animal-passport-events', tenantId, farmId, id, timelinePage, timelinePerPage],
    queryFn: async () => normalizeTimelineResponse(await animalsApi.listEvents(id, { page: timelinePage, per_page: timelinePerPage }), id),
    enabled: !!tenantId && !!id,
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  // Mirror to the global Toaster so feedback renders above any open modal.
  const notifySuccess = (msg) => { setSuccessMessage(msg); toast.success(msg); };
  const notifyError = (msg) => { setErrorMessage(msg); setShowError(true); toast.error(msg); };
  const [isEventOpen, setIsEventOpen] = useState(openCalvingForm);
  const EMPTY_ACTION = {
    title: '',
    description: '',
    date: '',
    type: 'Health',
    diagnosis: '',
    medications: '',
    vet: 'Dr. A. Njoroge',
    severity: 'Medium',
    status: 'Under Treatment',
    followUp: '',
    sireCode: '',
    semenSource: 'farm_stock',
    aiTime: '',
    technician: '',
    ownerName: '',
    farmLocation: '',
    certificateNumber: '',
    serviceFee: '',
    isRepeatService: false,
    milkVolumePta: '',
    calfTag: '',
    calfName: '',
    calfSex: '',
    birthWeightKg: '',
    deliveryOutcome: 'live',
  };
  const [newEvent, setNewEvent] = useState(() => ({
    ...EMPTY_ACTION,
    type: openCalvingForm ? 'Calving' : EMPTY_ACTION.type,
  }));
  const [formErrors, setFormErrors] = useState({});
  const [breedingCertificateFile, setBreedingCertificateFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState(null);
  const confirmation = useConfirmation();

  const animal = animalData ? normalizeAnimal(animalData, id) : null;
  const resolvedAnimal = animal ?? {
    id: id ?? copy.loading,
    name: copy.loading,
    breed: copy.unknownBreed,
  };
  const animalDisplayName = formatCowIdentity(resolvedAnimal, resolvedAnimal.name || copy.unknownCow);
  const timelineEvents = timelineResponse?.items ?? [];
  const timelineMeta = timelineResponse?.meta ?? { page: 1, per_page: timelinePerPage, total: 0, pages: 1 };

  const createEventMutation = useMutation({
    mutationFn: (payload) => animalsApi.createEvent(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromQuery = params.get('tab');
    const tabFromHash = location.hash.replace('#', '').trim();
    const desiredTab = tabFromQuery || tabFromHash;

    if (desiredTab === 'nutrition' || desiredTab === 'timeline') {
      setActiveTab(desiredTab);
    }
  }, [location.search, location.hash]);

  useEffect(() => {
    setTimelinePage(1);
  }, [activeFilter]);

  useEffect(() => () => {
    if (certificatePreviewUrl) URL.revokeObjectURL(certificatePreviewUrl);
  }, [certificatePreviewUrl]);

  if (!animal && !isLoading) {
    return (
      <div className="animate-reveal max-w-5xl mx-auto rounded-2xl border border-ink/10 bg-surface p-8 text-center text-body text-ink-muted">
        {copy.notAvailable}
      </div>
    );
  }

  const handleGenerateCertificate = async () => {
    if (!animal) return;

    try {
      setIsGeneratingCertificate(true);
      const pdf = await animalsApi.downloadPassportPdf(resolvedAnimal.id);
      const url = URL.createObjectURL(pdf);
      setCertificatePreviewUrl(url);
      notifySuccess(copy.certificateReady(animalDisplayName));
    } catch (error) {
      reportError(error, { where: 'AnimalRecord.generateCertificate' });
      notifyError(getApiErrorMessage(error, copy.certificateFailed(animalDisplayName)));
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (!certificatePreviewUrl) return;

    try {
      const anchor = document.createElement('a');
      anchor.href = certificatePreviewUrl;
      anchor.download = `Jivu_Passport_${resolvedAnimal.earTag || resolvedAnimal.tag_number || resolvedAnimal.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      notifySuccess(copy.certificateDownloaded(animalDisplayName));
    } catch (error) {
      reportError(error, { where: 'AnimalRecord.downloadCertificate' });
      notifyError(getApiErrorMessage(error, copy.certificateDownloadFailed(animalDisplayName)));
    }
  };

  const handleWhatsAppShare = () => {
    if (!animal) return;

    const publicVerifyLink = `https://jivu-dairy.com/verify/${resolvedAnimal.id}-TOKEN123`;
    const text = copy.shareText(animalDisplayName, resolvedAnimal.breed, publicVerifyLink);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleAddTimelineEvent = async (event) => {
    event?.preventDefault?.();
    setFormErrors({});
    setShowError(false);

    const actionType = newEvent.type;
    const errors = validateForm(newEvent, getAnimalActionValidationSchema(actionType));
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);

      // Health/Breeding write straight to the same endpoints the dedicated
      // pages use; the backend mirrors those writes into this animal's event
      // timeline itself, so there's no separate client-side mirror call here.
      if (actionType === 'Health') {
        const payload = buildHealthLogPayload(newEvent, resolvedAnimal.id);
        await medicalApi.createRecord(payload);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['medical-records', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] }),
        ]);

        notifySuccess(copy.healthSaved(resolvedAnimal.id));
      } else if (actionType === 'Breeding') {
        const payload = buildBreedingLogPayload(newEvent, id, resolvedAnimal.name);
        if (!payload) {
          throw new Error(copy.breedingBuildFailed);
        }

        const savedLog = await breedingApi.createLog(payload);
        const savedLogId = savedLog?.id ?? savedLog?.log_id ?? savedLog?.breeding_log_id;
        let certificateUploaded = false;
        if (breedingCertificateFile && savedLogId) {
          try {
            await breedingApi.uploadCertificate(savedLogId, breedingCertificateFile);
            certificateUploaded = true;
          } catch (certificateError) {
            reportError(certificateError, { where: 'AnimalRecord.uploadCertificate' });
            toast.error(copy.certificateUploadFailed);
          }
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] }),
        ]);

        notifySuccess(copy.breedingSaved(resolvedAnimal.id, certificateUploaded));
      } else if (actionType === 'Calving') {
        const payload = buildCalvingEventPayload(newEvent);
        await animalsApi.recordCalving(id, payload);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['animal-passport', tenantId, farmId, id] }),
          queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] }),
          queryClient.invalidateQueries({ queryKey: ['herd', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['animal-economics', tenantId, farmId, id] }),
          queryClient.invalidateQueries({ queryKey: ['feeding-plan-by-group', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['milk-lab-herd', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['milk-lab-target-overview', tenantId, farmId] }),
        ]);

        notifySuccess(copy.birthRecorded(resolvedAnimal.id));
      } else {
        const eventData = buildGeneralEventPayload(newEvent);
        const createdEvent = await createEventMutation.mutateAsync(eventData);
        const normalizedCreatedEvent = normalizeTimelineEvent(createdEvent, id);

        notifySuccess(copy.eventLogged(copy.eventTypes[normalizedCreatedEvent.type] ?? normalizedCreatedEvent.type, resolvedAnimal.id));
      }

      setActiveFilter('All');
      setNewEvent(EMPTY_ACTION);
      setBreedingCertificateFile(null);
      setIsEventOpen(false);
    } catch (error) {
      reportError(error, { where: 'AnimalRecord.addEvent' });
      notifyError(getApiErrorMessage(error, copy.saveFailed));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents = timelineEvents.filter(
    (eventItem) => activeFilter === 'All' || eventItem.type === activeFilter
  );

  return (
    <div className="animate-reveal space-y-6 max-w-5xl mx-auto">
      {/* ── ERROR & SUCCESS ALERTS ── */}
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
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/operations/herd" aria-label={copy.back} className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>

          <div>
            <h1 className="text-page-title text-brand m-0">
              {animalDisplayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="px-4 py-2 rounded-lg text-control border border-[#25D366]/30 bg-white text-[#128C7E] transition-colors hover:border-[#25D366] hover:bg-[#25D366]/5 flex items-center"
          >

    {copy.shareWhatsApp}
          </button>

          <button
            onClick={handleGenerateCertificate}
            disabled={isGeneratingCertificate}
            className="btn-command flex items-center text-control "
          >
            {isGeneratingCertificate ? copy.generating : copy.previewPdf}
          </button>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="success" title={copy.done} message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
        </div>
      )}

      <AnimalSummaryCards animal={animal} isLoading={isLoading} />

      <BaseModal closeOnBackdrop
        isOpen={Boolean(certificatePreviewUrl)}
        onClose={() => setCertificatePreviewUrl(null)}
        title={copy.certificateTitle(animalDisplayName)}
      >
        <iframe
          src={certificatePreviewUrl || undefined}
          title={copy.pdfPreview(animalDisplayName)}
          className="h-[65vh] w-full rounded-md border border-ink/10 bg-white"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => setCertificatePreviewUrl(null)} className="btn-secondary px-4 py-2 text-control">
            {copy.close}
          </button>
          <button type="button" onClick={handleDownloadCertificate} className="btn-command flex items-center px-4 py-2 text-control">

    {copy.downloadPdf}
          </button>
        </div>
      </BaseModal>

      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface p-4 ">
        <div>
          <h2 className="text-section-title text-brand">{copy.workspaceTitle}</h2>
          <p className="text-body text-ink-muted">{copy.workspaceHint}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md text-control transition-all ${activeTab === 'timeline' ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5'}`}
          >
            {copy.tabs.timeline}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`px-3 py-1.5 rounded-md text-control transition-all ${activeTab === 'nutrition' ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5'}`}
          >
            {copy.tabs.nutrition}
          </button>
        </div>
      </div>

      {activeTab === 'timeline' ? (
        <AnimalTimelineSection
          events={timelineEvents}
          filteredEvents={filteredEvents}
          isLoading={isTimelineLoading}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onOpenEventModal={() => setIsEventOpen(true)}
          timelineMeta={timelineMeta}
          timelinePage={timelinePage}
          onPreviousPage={() => setTimelinePage((current) => Math.max(1, current - 1))}
          onNextPage={() => setTimelinePage((current) => current + 1)}
          isPaginating={isTimelineLoading}
        />
      ) : (
        <AnimalNutritionPlanner animal={animal} tenantId={tenantId} farmId={farmId} />
      )}

      {/* ── LOG ACTION MODAL ── */}
      <BaseModal closeOnBackdrop isOpen={isEventOpen} onClose={() => { setIsEventOpen(false); setBreedingCertificateFile(null); }} title={form.title}>
        <form
          className="space-y-5"
          onSubmit={handleAddTimelineEvent}
        >
          <div className="border-b border-ink/10 pb-3">
            <h3 className="text-section-title text-brand">{newEvent.type === 'Breeding' ? service.details : form.actionDetails}</h3>
          </div>
          <div>
            <label className="mb-1 block text-field-label text-ink-muted">{form.eventType}</label>
            <select
              className="input-machined w-full"
              value={newEvent.type}
              onChange={(event) => setNewEvent((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="Health">{copy.eventTypes.Health}</option>
              <option value="Breeding">{copy.eventTypes.Breeding}</option>
              <option value="Calving">{copy.eventTypes.Calving}</option>
              <option value="General">{copy.eventTypes.General}</option>
            </select>
          </div>

          {newEvent.type === 'Breeding' && (
            <div>
              <label className="mb-1 block text-field-label text-ink-muted">{form.cow}</label>
              <input className="input-machined w-full" value={animalDisplayName} readOnly />
              <p className="mt-1 text-meta text-ink-muted">{form.cowHint}</p>
            </div>
          )}

          {newEvent.type === 'General' && (
            <div>
              <label className="mb-1 block text-field-label text-ink-muted">{form.eventTitle}</label>
              <input
                className="input-machined w-full"
                value={newEvent.title}
                onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))}
                placeholder={form.eventTitlePlaceholder}
              />
            </div>
          )}

          <div className={newEvent.type === 'Breeding' ? 'grid gap-4 md:grid-cols-2' : ''}>
            <div>
              <label className="mb-1 block text-field-label text-ink-muted">
                {newEvent.type === 'Health' ? form.visitDate : newEvent.type === 'Breeding' ? service.aiDate : newEvent.type === 'Calving' ? form.calvingDate : form.date}
              </label>
              <input
                type="date"
                className="input-machined w-full"
                value={newEvent.date}
                onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
            {newEvent.type === 'Breeding' && (
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{service.aiTime}</label>
                <input type="time" className="input-machined w-full" value={newEvent.aiTime} onChange={(event) => setNewEvent((current) => ({ ...current, aiTime: event.target.value }))} />
              </div>
            )}
          </div>

          {newEvent.type !== 'Breeding' && <div>
            <label className="mb-1 block text-field-label text-ink-muted">
              {newEvent.type === 'Health' ? form.signs : newEvent.type === 'Calving' ? form.calvingNotes : form.description}
            </label>
            <textarea
              className="input-machined w-full min-h-[96px]"
              value={newEvent.description}
              onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))}
              placeholder={form.descriptionPlaceholder}
            />
          </div>}

          {newEvent.type === 'Health' && (
            <>
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{form.diagnosis}</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.diagnosis}
                  onChange={(event) => setNewEvent((current) => ({ ...current, diagnosis: event.target.value }))}
                  placeholder={form.diagnosisPlaceholder}
                />
              </div>
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{form.medications}</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.medications}
                  onChange={(event) => setNewEvent((current) => ({ ...current, medications: event.target.value }))}
                  placeholder={form.medicationsPlaceholder}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.vet}</label>
                  <input
                    className="input-machined w-full"
                    value={newEvent.vet}
                    onChange={(event) => setNewEvent((current) => ({ ...current, vet: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.followUp}</label>
                  <input
                    type="date"
                    className="input-machined w-full"
                    value={newEvent.followUp}
                    onChange={(event) => setNewEvent((current) => ({ ...current, followUp: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.severity}</label>
                  <select
                    className="input-machined w-full"
                    value={newEvent.severity}
                    onChange={(event) => setNewEvent((current) => ({ ...current, severity: event.target.value }))}
                  >
                    <option value="Low">{healthCopy.severities.Low}</option>
                    <option value="Medium">{healthCopy.severities.Medium}</option>
                    <option value="High">{healthCopy.severities.High}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.status}</label>
                  <select
                    className="input-machined w-full"
                    value={newEvent.status}
                    onChange={(event) => setNewEvent((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="Under Treatment">{healthCopy.statuses['Under Treatment']}</option>
                    <option value="Follow-up Due">{healthCopy.statuses['Follow-up Due']}</option>
                    <option value="Closed">{healthCopy.statuses.Closed}</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {newEvent.type === 'Breeding' && (
            <>
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{service.certificateImage}</label>
                <input type="file" accept="image/*" className="input-machined w-full text-control" onChange={(event) => setBreedingCertificateFile(event.target.files?.[0] ?? null)} />
                <p className="mt-1 text-meta text-ink-muted">{service.certificateHint}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.technician}</label>
                  <input className="input-machined w-full" value={newEvent.technician} onChange={(event) => setNewEvent((current) => ({ ...current, technician: event.target.value }))} placeholder={service.technicianPlaceholder} />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.sireCode}</label>
                  <input className="input-machined w-full" value={newEvent.sireCode} onChange={(event) => setNewEvent((current) => ({ ...current, sireCode: event.target.value }))} placeholder={service.sireCodePlaceholder} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.ownerName}</label>
                  <input className="input-machined w-full" value={newEvent.ownerName} onChange={(event) => setNewEvent((current) => ({ ...current, ownerName: event.target.value }))} placeholder={service.ownerNamePlaceholder} />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.farmLocation}</label>
                  <input className="input-machined w-full" value={newEvent.farmLocation} onChange={(event) => setNewEvent((current) => ({ ...current, farmLocation: event.target.value }))} placeholder={service.farmLocationPlaceholder} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.certificateNumber}</label>
                  <input className="input-machined w-full" value={newEvent.certificateNumber} onChange={(event) => setNewEvent((current) => ({ ...current, certificateNumber: event.target.value }))} placeholder={service.certificateNumberPlaceholder} />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.serviceFee}</label>
                  <input type="number" min="0" step="0.01" className="input-machined w-full" value={newEvent.serviceFee} onChange={(event) => setNewEvent((current) => ({ ...current, serviceFee: event.target.value }))} placeholder="2500" />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised p-3 text-field-label text-ink-muted">
                <input type="checkbox" checked={newEvent.isRepeatService} onChange={(event) => setNewEvent((current) => ({ ...current, isRepeatService: event.target.checked }))} />
                {service.repeatService}
              </label>
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{service.notes}</label>
                <textarea className="input-machined w-full min-h-[96px]" value={newEvent.description} onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))} placeholder={service.notesPlaceholder} />
              </div>
              <div>
                <label className="mb-2 block text-field-label text-ink-muted">{service.semenSource}</label>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-ink/10 bg-surface-raised p-2 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-field-label text-ink-muted hover:border-brand/30">
                    <input type="radio" name="animal-breeding-semen-source" value="farm_stock" checked={newEvent.semenSource === 'farm_stock'} onChange={(event) => setNewEvent((current) => ({ ...current, semenSource: event.target.value }))} />
                    {breedingCopy.sources.farm_stock}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-field-label text-ink-muted hover:border-brand/30">
                    <input type="radio" name="animal-breeding-semen-source" value="vet_provided" checked={newEvent.semenSource === 'vet_provided'} onChange={(event) => setNewEvent((current) => ({ ...current, semenSource: event.target.value }))} />
                    {breedingCopy.sources.vet_provided}
                  </label>
                </div>
              </div>
              {newEvent.semenSource === 'vet_provided' && (
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{service.sirePta}</label>
                  <input type="number" step="0.01" className="input-machined w-full" value={newEvent.milkVolumePta} onChange={(event) => setNewEvent((current) => ({ ...current, milkVolumePta: event.target.value }))} placeholder={service.sirePtaPlaceholder} />
                </div>
              )}
            </>
          )}

          {newEvent.type === 'Calving' && (
            <div className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-meta text-brand-800">{form.calvingHint}</p>
              <div>
                <label className="mb-1 block text-field-label text-ink-muted">{form.outcome}</label>
                <select className="input-machined w-full" value={newEvent.deliveryOutcome} onChange={(event) => setNewEvent((current) => ({ ...current, deliveryOutcome: event.target.value }))}>
                  <option value="live">{form.liveCalf}</option>
                  <option value="stillborn">{form.stillborn}</option>
                </select>
              </div>
              {newEvent.deliveryOutcome === 'live' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.calfTag}</label>
                  <input className="input-machined w-full" value={newEvent.calfTag} onChange={(event) => setNewEvent((current) => ({ ...current, calfTag: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.calfName}</label>
                  <input className="input-machined w-full" value={newEvent.calfName} onChange={(event) => setNewEvent((current) => ({ ...current, calfName: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.calfSex}</label>
                  <select className="input-machined w-full" value={newEvent.calfSex} onChange={(event) => setNewEvent((current) => ({ ...current, calfSex: event.target.value }))}>
                    <option value="">{form.notRecorded}</option>
                    <option value="female">{form.female}</option>
                    <option value="male">{form.male}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-field-label text-ink-muted">{form.birthWeight}</label>
                  <input type="number" min="0" step="0.1" className="input-machined w-full" value={newEvent.birthWeightKg} onChange={(event) => setNewEvent((current) => ({ ...current, birthWeightKg: event.target.value }))} />
                </div>
              </div>}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={() => { setIsEventOpen(false); setBreedingCertificateFile(null); }}
              className="btn-secondary px-4 py-2 text-control"
            >
              {form.cancel}
            </button>
            <button type="submit" className="btn-command px-4 py-2 text-control">
              {form.save}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
