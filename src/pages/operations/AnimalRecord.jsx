import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  buildGeneralEventPayload,
} from '../../lib/animalActionLog';
import LABELS from '../../lib/labels';
import { animalsApi, medicalApi, breedingApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
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
  const [isEventOpen, setIsEventOpen] = useState(false);
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
  };
  const [newEvent, setNewEvent] = useState(EMPTY_ACTION);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const confirmation = useConfirmation();

  const animal = animalData ? normalizeAnimal(animalData, id) : null;
  const resolvedAnimal = animal ?? {
    id: id ?? 'Loading…',
    name: 'Loading…',
    breed: 'Unknown',
  };
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
      setSuccessMessage(`Generating Certified Biological Record for ${resolvedAnimal.id}...`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
    }
  };

  const handleWhatsAppShare = () => {
    if (!animal) return;

    const publicVerifyLink = `https://jivu-dairy.com/verify/${resolvedAnimal.id}-TOKEN123`;
    const text = `Hello, here is the official Certified Cow Record for ${resolvedAnimal.id} (${resolvedAnimal.name}).\n\nBreed: ${resolvedAnimal.breed}\nView the verified medical passport here: ${publicVerifyLink}`;
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

        setSuccessMessage(`Medical record saved for ${resolvedAnimal.id} — also visible on Medical Records.`);
      } else if (actionType === 'Breeding') {
        const payload = buildBreedingLogPayload(newEvent, id, resolvedAnimal.name);
        if (!payload) {
          throw new Error('Unable to build a valid breeding log from the entered details.');
        }

        const savedLog = await breedingApi.createLog(payload);

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

        setSuccessMessage(`Breeding log saved for ${resolvedAnimal.id} — also visible on Breeding & Genetics.`);
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

        setSuccessMessage(`Logged ${normalizedCreatedEvent.type.toLowerCase()} event for ${resolvedAnimal.id}.`);
      }

      setActiveFilter('All');
      setNewEvent(EMPTY_ACTION);
      setIsEventOpen(false);
    } catch (error) {
      console.error('Error adding event:', error);
      setErrorMessage(error?.message || 'Failed to add event. Please try again.');
      setShowError(true);
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
              {resolvedAnimal.id} <span className="text-ink-muted">({resolvedAnimal.name})</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleWhatsAppShare}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#25D366]/30 bg-white text-[#128C7E] shadow-sm transition-colors hover:border-[#25D366] hover:bg-[#25D366]/5 flex items-center gap-2"
          >
            <Share2 size={16} /> Send using WhatsApp
          </button>

          <button 
            onClick={handleGenerateCertificate}
            className="btn-command flex items-center gap-2 text-sm shadow-sm"
          >
            <Download size={16} /> Print PDF
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

      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface p-4 shadow-sm">
        <div>
          <h3 className="font-bold text-brand">Record Workspace</h3>
          <p className="text-sm text-ink-muted">Switch between the timeline and the nutrition planner. Each section is isolated behind a smaller component boundary.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'timeline' ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5'}`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'nutrition' ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5'}`}
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
      <Modal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} title="Log Action">
        <form
          className="space-y-4"
          onSubmit={handleAddTimelineEvent}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Event Type</label>
            <select
              className="input-machined w-full"
              value={newEvent.type}
              onChange={(event) => setNewEvent((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="Health">Health</option>
              <option value="Breeding">Breeding</option>
              <option value="General">General</option>
            </select>
          </div>

          {newEvent.type === 'General' && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Title</label>
              <input
                className="input-machined w-full"
                value={newEvent.title}
                onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Fence repaired"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">
              {newEvent.type === 'Health' ? 'Visit date' : newEvent.type === 'Breeding' ? 'Insemination date *' : 'Date'}
            </label>
            <input
              type="date"
              className="input-machined w-full"
              value={newEvent.date}
              onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">
              {newEvent.type === 'Health' ? 'Signs of sickness *' : newEvent.type === 'Breeding' ? 'Notes' : 'Description'}
            </label>
            <textarea
              className="input-machined w-full min-h-[110px]"
              value={newEvent.description}
              onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add treatment notes, breeding details, or general remarks"
            />
          </div>

          {newEvent.type === 'Health' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Diagnosis *</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.diagnosis}
                  onChange={(event) => setNewEvent((current) => ({ ...current, diagnosis: event.target.value }))}
                  placeholder="e.g. Mastitis, Milk Fever"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Medications prescribed *</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.medications}
                  onChange={(event) => setNewEvent((current) => ({ ...current, medications: event.target.value }))}
                  placeholder="Name and dosage"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Vet *</label>
                  <input
                    className="input-machined w-full"
                    value={newEvent.vet}
                    onChange={(event) => setNewEvent((current) => ({ ...current, vet: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Follow-up date *</label>
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Severity</label>
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Status</label>
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Semen / sire code *</label>
                <input
                  className="input-machined w-full"
                  value={newEvent.sireCode}
                  onChange={(event) => setNewEvent((current) => ({ ...current, sireCode: event.target.value }))}
                  placeholder="e.g. HF-2201"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Semen source</label>
                <select
                  className="input-machined w-full"
                  value={newEvent.semenSource}
                  onChange={(event) => setNewEvent((current) => ({ ...current, semenSource: event.target.value }))}
                >
                  <option value="farm_stock">Farm Stock</option>
                  <option value="vet_provided">Vet Provided</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEventOpen(false)}
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