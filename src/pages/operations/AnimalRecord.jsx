import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Activity, Syringe, Baby, Calendar, Droplets,
  HeartPulse, ShieldCheck, FileText, Filter, ArrowLeft, Download, Share2, Calculator, Plus, AlertCircle
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Skeleton } from '../../components/ui';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';
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

export default function AnimalPassport() {
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
    id: id ?? 'Loading…',
    name: 'Loading…',
    breed: 'Unknown',
  };
  const animalDisplayName = formatCowIdentity(resolvedAnimal, resolvedAnimal.name || 'Unknown cow');
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
      <div className="animate-reveal max-w-5xl mx-auto rounded-2xl border border-ink/10 bg-surface p-8 text-center text-sm text-ink-muted">
        No animal record is available yet.
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
      notifySuccess(`Certified Biological Record is ready to preview for ${animalDisplayName}.`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      notifyError(getApiErrorMessage(error, `Could not generate the record for ${animalDisplayName}. Please try again.`));
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
      notifySuccess(`Certified Biological Record downloaded for ${animalDisplayName}.`);
    } catch (error) {
      console.error('Failed to download PDF', error);
      notifyError(`Could not download the Certified Biological Record for ${animalDisplayName}.`);
    }
  };

  const handleWhatsAppShare = () => {
    if (!animal) return;

    const publicVerifyLink = `https://jivu-dairy.com/verify/${resolvedAnimal.id}-TOKEN123`;
    const text = `Hello, here is the official Certified Cow Record for ${animalDisplayName}.\n\nBreed: ${resolvedAnimal.breed}\nView the verified medical passport here: ${publicVerifyLink}`;
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
        const savedRecord = await medicalApi.createRecord(payload);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['medical-records', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] }),
        ]);

        logToAuditTrail(createAuditEntry({
          action: 'create',
          recordType: 'medical-record',
          recordId: savedRecord?.id ?? null,
          userName: payload.vet || 'You',
          notes: `Logged vet visit: ${payload.diagnosis}`,
        }));

        notifySuccess(`Medical record saved for ${resolvedAnimal.id} — also visible on Medical Records.`);
      } else if (actionType === 'Breeding') {
        const payload = buildBreedingLogPayload(newEvent, id, resolvedAnimal.name);
        if (!payload) {
          throw new Error('Unable to build a valid breeding log from the entered details.');
        }

        const savedLog = await breedingApi.createLog(payload);
        const savedLogId = savedLog?.id ?? savedLog?.log_id ?? savedLog?.breeding_log_id;
        let certificateUploaded = false;
        if (breedingCertificateFile && savedLogId) {
          try {
            await breedingApi.uploadCertificate(savedLogId, breedingCertificateFile);
            certificateUploaded = true;
          } catch (certificateError) {
            console.error('AI certificate upload failed:', certificateError);
            toast.error('AI service was saved, but the certificate could not be uploaded. Please retry the attachment.');
          }
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] }),
          queryClient.invalidateQueries({ queryKey: ['animal-passport-events', tenantId, farmId, id] }),
        ]);

        logToAuditTrail(createAuditEntry({
          action: 'create',
          recordType: 'breeding-log',
          recordId: savedLog?.id ?? null,
          userName: 'You',
          notes: `Logged AI service: ${payload.semen_id}`,
        }));

        notifySuccess(`Breeding log saved for ${resolvedAnimal.id}${certificateUploaded ? ' with certificate attached' : ''} — also visible on Breeding & Genetics.`);
      } else if (actionType === 'Calving') {
        const payload = buildCalvingEventPayload(newEvent);
        const savedEvent = await animalsApi.recordCalving(id, payload);

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

        logToAuditTrail(createAuditEntry({
          action: 'create',
          recordType: 'calving-event',
          recordId: savedEvent?.id ?? null,
          userName: 'You',
          notes: `Recorded calving for ${resolvedAnimal.id}`,
        }));

        notifySuccess(`Birth recorded for ${resolvedAnimal.id}. The animal record is up to date.`);
      } else {
        const eventData = buildGeneralEventPayload(newEvent);
        const createdEvent = await createEventMutation.mutateAsync(eventData);
        const normalizedCreatedEvent = normalizeTimelineEvent(createdEvent, id);

        logToAuditTrail(createAuditEntry({
          action: 'create',
          recordType: 'timeline_event',
          recordId: normalizedCreatedEvent.id,
          userName: 'You',
          notes: `Added ${normalizedCreatedEvent.type} event: ${normalizedCreatedEvent.title}`,
        }));

        notifySuccess(`Logged ${normalizedCreatedEvent.type.toLowerCase()} event for ${resolvedAnimal.id}.`);
      }

      setActiveFilter('All');
      setNewEvent(EMPTY_ACTION);
      setBreedingCertificateFile(null);
      setIsEventOpen(false);
    } catch (error) {
      console.error('Error adding event:', error);
      notifyError(getApiErrorMessage(error, 'Could not save this event. Check the details and try again.'));
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
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/operations/herd" className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
              <Activity size={12} /> Cow Record
            </div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0">
              {animalDisplayName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#25D366]/30 bg-white text-[#128C7E]  transition-colors hover:border-[#25D366] hover:bg-[#25D366]/5 flex items-center gap-2"
          >
            <Share2 size={16} /> Send using WhatsApp
          </button>

          <button
            onClick={handleGenerateCertificate}
            disabled={isGeneratingCertificate}
            className="btn-command flex items-center gap-2 text-sm "
          >
            <FileText size={16} /> {isGeneratingCertificate ? 'Generating...' : 'Preview PDF'}
          </button>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
          <AlertBanner type="success" title="Done" message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
        </div>
      )}

      <AnimalSummaryCards animal={animal} isLoading={isLoading} />

      <Modal
        isOpen={Boolean(certificatePreviewUrl)}
        onClose={() => setCertificatePreviewUrl(null)}
        title={`Certified Biological Record: ${animalDisplayName}`}
      >
        <iframe
          src={certificatePreviewUrl || undefined}
          title={`PDF preview for ${animalDisplayName}`}
          className="h-[65vh] w-full rounded-md border border-ink/10 bg-white"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => setCertificatePreviewUrl(null)} className="btn-secondary px-4 py-2 text-sm">
            Close
          </button>
          <button type="button" onClick={handleDownloadCertificate} className="btn-command flex items-center gap-2 px-4 py-2 text-sm">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </Modal>

      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface p-4 ">
        <div>
          <h3 className="font-bold text-brand">Record Workspace</h3>
          <p className="text-sm text-ink-muted">Switch between the timeline and the nutrition planner. Each section is isolated behind a smaller component boundary.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'timeline' ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5'}`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'nutrition' ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5'}`}
          >
            Nutrition Planner
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
      <Modal isOpen={isEventOpen} onClose={() => { setIsEventOpen(false); setBreedingCertificateFile(null); }} title="Log Action">
        <form
          className="space-y-5"
          onSubmit={handleAddTimelineEvent}
        >
          <div className="border-b border-ink/10 pb-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-brand">{newEvent.type === 'Breeding' ? 'Service Details' : 'Action Details'}</h4>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Event Type</label>
            <select
              className="input-machined w-full"
              value={newEvent.type}
              onChange={(event) => setNewEvent((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="Health">Health</option>
              <option value="Breeding">Breeding</option>
              <option value="Calving">Birth / Calving</option>
              <option value="General">General</option>
            </select>
          </div>

          {newEvent.type === 'Breeding' && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Cow name or ear tag *</label>
              <input className="input-machined w-full" value={animalDisplayName} readOnly />
              <p className="mt-1 text-[11px] text-ink-muted">This AI service will be recorded for the animal currently open.</p>
            </div>
          )}

          {newEvent.type === 'General' && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Title</label>
              <input
                className="input-machined w-full"
                value={newEvent.title}
                onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Fence repaired"
              />
            </div>
          )}

          <div className={newEvent.type === 'Breeding' ? 'grid gap-4 md:grid-cols-2' : ''}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                {newEvent.type === 'Health' ? 'Visit date' : newEvent.type === 'Breeding' ? 'AI Date *' : newEvent.type === 'Calving' ? 'Calving date *' : 'Date'}
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Time</label>
                <input type="time" className="input-machined w-full" value={newEvent.aiTime} onChange={(event) => setNewEvent((current) => ({ ...current, aiTime: event.target.value }))} />
              </div>
            )}
          </div>

          {newEvent.type !== 'Breeding' && <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
              {newEvent.type === 'Health' ? 'Signs of sickness *' : newEvent.type === 'Calving' ? 'Calving notes' : 'Description'}
            </label>
            <textarea
              className="input-machined w-full min-h-[96px]"
              value={newEvent.description}
              onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add treatment notes, breeding details, or general remarks"
            />
          </div>}

          {newEvent.type === 'Health' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Diagnosis *</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.diagnosis}
                  onChange={(event) => setNewEvent((current) => ({ ...current, diagnosis: event.target.value }))}
                  placeholder="e.g. Mastitis, Milk Fever"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Medications prescribed *</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.medications}
                  onChange={(event) => setNewEvent((current) => ({ ...current, medications: event.target.value }))}
                  placeholder="Name and dosage"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Vet *</label>
                  <input
                    className="input-machined w-full"
                    value={newEvent.vet}
                    onChange={(event) => setNewEvent((current) => ({ ...current, vet: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Follow-up date *</label>
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Severity</label>
                  <select
                    className="input-machined w-full"
                    value={newEvent.severity}
                    onChange={(event) => setNewEvent((current) => ({ ...current, severity: event.target.value }))}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Status</label>
                  <select
                    className="input-machined w-full"
                    value={newEvent.status}
                    onChange={(event) => setNewEvent((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option>Under Treatment</option>
                    <option>Follow-up Due</option>
                    <option>Closed</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {newEvent.type === 'Breeding' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Certificate Image</label>
                <input type="file" accept="image/*" className="input-machined w-full text-sm" onChange={(event) => setBreedingCertificateFile(event.target.files?.[0] ?? null)} />
                <p className="mt-1 text-[11px] text-ink-muted">Optional. The image is attached to this AI record after it is created.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Technician Name</label>
                  <input className="input-machined w-full" value={newEvent.technician} onChange={(event) => setNewEvent((current) => ({ ...current, technician: event.target.value }))} placeholder="e.g. Dr. Njeri" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Sire Code *</label>
                  <input className="input-machined w-full" value={newEvent.sireCode} onChange={(event) => setNewEvent((current) => ({ ...current, sireCode: event.target.value }))} placeholder="e.g. FR-889" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Owner Name</label>
                  <input className="input-machined w-full" value={newEvent.ownerName} onChange={(event) => setNewEvent((current) => ({ ...current, ownerName: event.target.value }))} placeholder="e.g. Elizabeth Mugo" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Farm / Location</label>
                  <input className="input-machined w-full" value={newEvent.farmLocation} onChange={(event) => setNewEvent((current) => ({ ...current, farmLocation: event.target.value }))} placeholder="e.g. Bahati" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Certificate Number</label>
                  <input className="input-machined w-full" value={newEvent.certificateNumber} onChange={(event) => setNewEvent((current) => ({ ...current, certificateNumber: event.target.value }))} placeholder="e.g. AI-817" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Service Fee (KES)</label>
                  <input type="number" min="0" step="0.01" className="input-machined w-full" value={newEvent.serviceFee} onChange={(event) => setNewEvent((current) => ({ ...current, serviceFee: event.target.value }))} placeholder="2500" />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised p-3 text-sm font-semibold text-ink-strong">
                <input type="checkbox" checked={newEvent.isRepeatService} onChange={(event) => setNewEvent((current) => ({ ...current, isRepeatService: event.target.checked }))} />
                Repeat service
              </label>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Notes</label>
                <textarea className="input-machined w-full min-h-[96px]" value={newEvent.description} onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))} placeholder="Optional service notes" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink-muted">Semen Source *</label>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-ink/10 bg-surface-raised p-2 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
                    <input type="radio" name="animal-breeding-semen-source" value="farm_stock" checked={newEvent.semenSource === 'farm_stock'} onChange={(event) => setNewEvent((current) => ({ ...current, semenSource: event.target.value }))} />
                    Farm Stock
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
                    <input type="radio" name="animal-breeding-semen-source" value="vet_provided" checked={newEvent.semenSource === 'vet_provided'} onChange={(event) => setNewEvent((current) => ({ ...current, semenSource: event.target.value }))} />
                    Vet Provided
                  </label>
                </div>
              </div>
              {newEvent.semenSource === 'vet_provided' && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Sire PTA Milk Volume (L/day)</label>
                  <input type="number" step="0.01" className="input-machined w-full" value={newEvent.milkVolumePta} onChange={(event) => setNewEvent((current) => ({ ...current, milkVolumePta: event.target.value }))} placeholder="e.g. 28.5" />
                </div>
              )}
            </>
          )}

          {newEvent.type === 'Calving' && (
            <div className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-xs text-brand-800">When you save, the mother’s details, breeding record, lactation cycle, and calf record will all be updated together.</p>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Delivery outcome *</label>
                <select className="input-machined w-full" value={newEvent.deliveryOutcome} onChange={(event) => setNewEvent((current) => ({ ...current, deliveryOutcome: event.target.value }))}>
                  <option value="live">Live calf</option>
                  <option value="stillborn">Stillborn</option>
                </select>
              </div>
              {newEvent.deliveryOutcome === 'live' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Calf tag</label>
                  <input className="input-machined w-full" value={newEvent.calfTag} onChange={(event) => setNewEvent((current) => ({ ...current, calfTag: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Calf name</label>
                  <input className="input-machined w-full" value={newEvent.calfName} onChange={(event) => setNewEvent((current) => ({ ...current, calfName: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Calf sex</label>
                  <select className="input-machined w-full" value={newEvent.calfSex} onChange={(event) => setNewEvent((current) => ({ ...current, calfSex: event.target.value }))}>
                    <option value="">Not recorded</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Birth weight (kg)</label>
                  <input type="number" min="0" step="0.1" className="input-machined w-full" value={newEvent.birthWeightKg} onChange={(event) => setNewEvent((current) => ({ ...current, birthWeightKg: event.target.value }))} />
                </div>
              </div>}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={() => { setIsEventOpen(false); setBreedingCertificateFile(null); }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button type="submit" className="btn-command px-4 py-2 text-sm">
              Save Event
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
