import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, Syringe, Baby, Calendar, Droplets, 
  HeartPulse, ShieldCheck, FileText, Filter, ArrowLeft, Download, Share2, Calculator, Plus, AlertCircle
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '../../components/ui';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../lib/validation';
import { formatDateTime, getRelativeTime, createAuditEntry, logToAuditTrail } from '../../lib/audit';
import LABELS from '../../lib/labels';
import { animalsApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import cowAvatar from '../../assets/cow-avatar.svg';
import AnimalSummaryCards from '../../components/operations/animalRecord/AnimalSummaryCards';
import AnimalTimelineSection from '../../components/operations/animalRecord/AnimalTimelineSection';
import AnimalNutritionPlanner from '../../components/operations/animalRecord/AnimalNutritionPlanner';

function getAvatarLabel(animal) {
  const nameInitial = animal?.name?.trim()?.charAt(0)?.toUpperCase();
  const idInitial = animal?.id?.trim()?.charAt(0)?.toUpperCase();
  return nameInitial || idInitial || 'C';
}

function calculateDaysInMilk(lastCalved) {
  if (!lastCalved) return null;

  const calvingDate = new Date(lastCalved);
  if (Number.isNaN(calvingDate.getTime())) return null;

  const elapsedDays = Math.floor((Date.now() - calvingDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, elapsedDays);
}

function getTimelineTheme(type) {
  if (type === 'Health') {
    return {
      badgeClass: 'text-danger bg-danger/10 border-danger/20',
      cardClass: 'border-l-danger bg-danger/5 border-danger/15',
    };
  }

  if (type === 'Breeding') {
    return {
      badgeClass: 'text-brand bg-brand/10 border-brand/20',
      cardClass: 'border-l-brand bg-brand/5 border-brand/15',
    };
  }

  return {
    badgeClass: 'text-accent-dark bg-accent/10 border-accent/20',
    cardClass: 'border-l-accent bg-accent/5 border-accent/15',
  };
}

function TimelineEventCard({ event }) {
  const theme = getTimelineTheme(event.type);

  return (
    <div className="relative flex items-start group">
      <div className={`absolute left-[-22px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface transition-transform group-hover:scale-110 md:left-[-34px] ${theme.badgeClass}`}>
        {event.icon}
      </div>

      <div className="ml-6 w-full md:ml-4">
        <div className={`rounded-xl border bg-surface p-4 transition-colors hover:bg-surface-raised ${theme.cardClass}`}>
          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h4 className="text-sm font-bold text-ink md:text-base">{event.title}</h4>
            <span className="rounded bg-surface-warm px-2 py-0.5 font-mono text-xs text-ink-muted">{event.date}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">{event.description}</p>
        </div>
      </div>
    </div>
  );
}

function normalizeTimelineEvent(entry = {}, animalId = '') {
  const eventType = entry.event_type ?? entry.type ?? 'general';
  const normalizedType = `${eventType}`.trim().toLowerCase();
  const displayType = normalizedType === 'health' ? 'Health' : normalizedType === 'breeding' ? 'Breeding' : 'General';

  return {
    id: entry.id ?? `${animalId}-${entry.created_at ?? entry.event_date ?? Date.now()}`,
    cowId: entry.cow_id ?? entry.cowId ?? animalId,
    tenantId: entry.tenant_id ?? entry.tenantId ?? null,
    type: displayType,
    title: entry.title ?? `${displayType} event`,
    description: entry.description ?? 'No additional details provided.',
    date: formatDateTime(entry.event_date ?? entry.created_at ?? entry.createdAt ?? new Date().toISOString()),
    rawDate: entry.event_date ?? entry.created_at ?? entry.createdAt ?? null,
    eventData: entry.event_data ?? entry.eventData ?? null,
    createdBy: entry.created_by ?? entry.createdBy ?? null,
    createdAt: entry.created_at ?? entry.createdAt ?? null,
    iconKey: normalizedType,
  };
}

function normalizeTimelineResponse(response, animalId = '') {
  const items = Array.isArray(response?.items) ? response.items : [];
  const meta = response?.meta ?? { page: 1, per_page: items.length || 20, total: items.length, pages: 1 };

  return {
    items: items.map((item) => normalizeTimelineEvent(item, animalId)),
    meta,
  };
}

function normalizeAnimal(animal = {}, id = '') {
  const ageMonths = Number(animal.ageMonths ?? animal.age_months ?? 0);
  return {
    id: animal.id ?? animal.cow_id ?? animal.ear_tag ?? id,
    name: animal.name ?? animal.cow_name ?? 'Unnamed',
    breed: animal.breed ?? animal.breed_name ?? 'Unknown',
    ageMonths,
    status: animal.status ?? animal.lactation_status ?? 'Cow',
    lastCalved: animal.lastCalved ?? animal.last_calved ?? null,
    milk: animal.milk ?? animal.daily_milk ?? '0.0 L/day',
  };
}

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

  const { data: timelineResponse, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['animal-passport-events', tenantId, farmId, id, timelinePage, timelinePerPage],
    queryFn: async () => normalizeTimelineResponse(await animalsApi.listEvents(id, { page: timelinePage, per_page: timelinePerPage }), id),
    enabled: !!tenantId && !!id,
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', type: 'Health' });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const confirmation = useConfirmation();

  // Nutrition planner state
  const [targetYield, setTargetYield] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [feedEfficiency, setFeedEfficiency] = useState(0.5);
  const [feedPrice, setFeedPrice] = useState(60); 
  const [feedCurrency, setFeedCurrency] = useState('KES'); 
  const [plannerResult, setPlannerResult] = useState(null);

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

    // Validate
    const validationSchema = {
      title: [ValidationRules.required, ValidationRules.minLength(3)],
      description: [ValidationRules.minLength(5)],
    };

    const errors = validateForm(newEvent, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage(getFirstErrorMessage(errors));
      setShowError(true);
      return;
    }

    try {
      setIsSaving(true);
      const eventType = (newEvent.type || 'general').toLowerCase();
      const eventData = {
        event_type: eventType,
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        event_date: newEvent.date ? new Date(newEvent.date).toISOString() : undefined,
        event_data: { source: 'animal-passport' },
        metadata: { source: 'animal-passport' },
      };

      const createdEvent = await createEventMutation.mutateAsync(eventData);
      const normalizedCreatedEvent = normalizeTimelineEvent(createdEvent, id);

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'timeline_event',
          recordId: normalizedCreatedEvent.id,
          userName: 'You',
          notes: `Added ${normalizedCreatedEvent.type} event: ${normalizedCreatedEvent.title}`,
        })
      );

      setActiveFilter('All');
      setSuccessMessage(`Logged ${normalizedCreatedEvent.type.toLowerCase()} event for ${resolvedAnimal.id}.`);
      setNewEvent({ title: '', description: '', date: '', type: 'Health' });
      setIsEventOpen(false);
    } catch (error) {
      console.error('Error adding event:', error);
      setErrorMessage('Failed to add event. Please try again.');
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents = timelineEvents.filter(event => 
    activeFilter === 'All' || event.type === activeFilter
  );

  return (
    <div className="animate-reveal space-y-6 max-w-5xl mx-auto">
      {/* ── ERROR & SUCCESS ALERTS ── */}
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
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
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
        <AnimalNutritionPlanner animal={animal} />
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

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Title</label>
            <input
              className="input-machined w-full"
              value={newEvent.title}
              onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Vet check completed"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Date</label>
            <input
              type="date"
              className="input-machined w-full"
              value={newEvent.date}
              onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-strong">Description</label>
            <textarea
              className="input-machined w-full min-h-[110px]"
              value={newEvent.description}
              onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add treatment notes, breeding details, or general remarks"
              required
            />
          </div>

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