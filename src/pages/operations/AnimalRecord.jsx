import React, { useState } from 'react';
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
import cowAvatar from '../../assets/cow-avatar.svg';

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

function createTimelineEntry(event) {
  const toneByType = {
    Health: 'text-danger bg-danger/10 border-danger/20',
    Breeding: 'text-brand bg-brand/10 border-brand/20',
    General: 'text-accent bg-accent/10 border-accent/20',
  };

  return {
    id: Date.now(),
    date: event.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    type: event.type || 'General',
    title: event.title?.trim() || 'Untitled Event',
    description: event.description?.trim() || 'No additional details provided.',
    icon: event.type === 'Health' ? <HeartPulse size={16} /> : event.type === 'Breeding' ? <Syringe size={16} /> : <FileText size={16} />,
    color: toneByType[event.type] || 'text-ink-muted bg-surface-raised border-ink/10',
  };
}

export default function AnimalPassport() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLoading] = useState(false);
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
  const { id } = useParams();

  const handleGenerateCertificate = async () => {
    try {
      setSuccessMessage(`Generating Certified Biological Record for ${animal.id}...`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
    }
  };

  const handleWhatsAppShare = () => {
    const publicVerifyLink = `https://jivu-dairy.com/verify/${animal.id}-TOKEN123`;
    const text = `Hello, here is the official Certified Cow Record for ${animal.id} (${animal.name}).\n\nBreed: ${animal.breed}\nView the verified medical passport here: ${publicVerifyLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Mock Data: Animal Profile (Updated with Yesterday's Yield & Farmer Vocabulary)
  const animal = {
    id: id || "C-101",
    name: "Luna",
    breed: "75% Friesian (Graded Up)",
    age: "3 Years, 2 Months",
    status: "Active Milker",
    peakYield: "26.5 L/day", 
    yesterdayYield: "18.2 L",
    sevenDayAvg: '24.8 L',
    pregnancyStatus: 'Not Pregnant',
    daysOpen: 84,
    lastCalved: '2025-03-02',
    photoUrl: cowAvatar,
    sire: "FR-889 (Premium AI)",
    dam: "C-042 (Bella)"
  };

  // Mock Data: Lifetime Chronological Events
  const [events, setEvents] = useState([
    {
      id: 1,
      date: "May 10, 2026",
      type: "General",
      title: "Current Best Daily Milk Recorded",
      description: "Hit a new seasonal peak of 26.5 Liters during the morning milking session.",
      icon: <Droplets size={16} />,
      color: "text-accent bg-accent/10 border-accent/20"
    },
    {
      id: 2,
      date: "Nov 14, 2025",
      type: "Health",
      title: "Mild Mastitis Treatment",
      description: "Treated front-left quarter with intramammary antibiotics. 3-day milk withdrawal enforced and cleared.",
      icon: <HeartPulse size={16} />,
      color: "text-danger bg-danger/10 border-danger/20"
    },
    {
      id: 3,
      date: "Mar 02, 2025",
      type: "Breeding",
      title: "First Calving (Successful)",
      description: "Delivered a healthy female calf (C-108) unassisted. Post-calving calcium administered.",
      icon: <Baby size={16} />,
      color: "text-brand bg-brand/10 border-brand/20"
    },
    {
      id: 4,
      date: "Jun 15, 2024",
      type: "Breeding",
      title: "First Insemination (AI)",
      description: "Inseminated with AY-201 (Highland Ayrshire). Confirmed pregnant at 60-day PD check.",
      icon: <Syringe size={16} />,
      color: "text-brand bg-brand/10 border-brand/20"
    },
    {
      id: 5,
      date: "Apr 20, 2023",
      type: "Health",
      title: "Dehorning & Vaccination",
      description: "Routine calf care protocol completed. FMD and Anthrax vaccines administered.",
      icon: <ShieldCheck size={16} />,
      color: "text-danger bg-danger/10 border-danger/20"
    },
    {
      id: 6,
      date: "Mar 15, 2023",
      type: "General",
      title: "Birth & Registration",
      description: "Born on farm. Tagged and registered in the Jivu System.",
      icon: <FileText size={16} />,
      color: "text-ink-muted bg-surface-raised border-ink/10"
    }
  ]);

  const handleAddTimelineEvent = async (e) => {
    e.preventDefault();
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
      await new Promise((resolve) => setTimeout(resolve, 300));

      const timelineEvent = createTimelineEntry(newEvent);
      setEvents((current) => [timelineEvent, ...current]);

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'timeline_event',
          recordId: timelineEvent.id,
          userName: 'You',
          notes: `Added ${newEvent.type} event: ${newEvent.title}`,
        })
      );

      setActiveFilter('All');
      setSuccessMessage(`Logged ${newEvent.type.toLowerCase()} event for ${animal.id}.`);
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

  const filteredEvents = events.filter(event => 
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
              {animal.id} <span className="text-ink-muted">({animal.name})</span>
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

      {/* ── COW VITAL SIGNS (4-COLUMN SUMMARY GRID) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* 1. COW DETAILS */}
        <div className="card-machined bg-surface p-6 rounded-2xl border border-ink/5 shadow-sm flex flex-col items-center text-center justify-center">
          <div className="relative h-16 w-16 mb-4 shrink-0 overflow-hidden rounded-full border border-brand/10 bg-gradient-to-br from-brand/15 via-accent/10 to-surface shadow-sm flex items-center justify-center text-brand font-black text-xl">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : animal.photoUrl ? (
              <img src={animal.photoUrl} alt="Cow Avatar" className="w-full h-full object-cover" />
            ) : (
              getAvatarLabel(animal)
            )}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1">
            Breed & Parents
          </div>
          <div className="text-lg font-black text-brand mb-2">
            {isLoading ? <Skeleton className="h-6 w-32 mx-auto" /> : animal.breed}
          </div>
          <div className="text-xs font-medium text-ink-muted leading-relaxed">
            {isLoading ? <Skeleton className="h-4 w-40 mx-auto" /> : <>Sire: {animal.sire} <br /> Dam: {animal.dam}</>}
          </div>
        </div>

        {/* 2. AGE & STATUS */}
        <div className="card-machined bg-surface p-6 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">
              Age & Status
            </div>
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Current Age</div>
              <div className="text-xl font-black text-ink-strong">
                {isLoading ? <Skeleton className="h-6 w-24" /> : animal.age}
              </div>
            </div>
          </div>
          <div className="border-t border-ink/10 pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Milking Status</div>
            <div className="text-sm font-bold text-ink-strong">
              {isLoading ? <Skeleton className="h-4 w-20" /> : animal.status}
            </div>
          </div>
        </div>

        {/* 3. MILK YIELD */}
        <div className="card-machined bg-surface p-6 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">
              Milk Yield
            </div>
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Days in Milk</div>
              <div className="flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <span className="text-xl font-black text-ink-strong">{calculateDaysInMilk(animal.lastCalved) ?? 'N/A'}</span>
                )}
                {!isLoading && <span className="text-xs font-bold text-ink-muted">Days</span>}
              </div>
              <div className="text-[11px] font-medium text-ink-muted mt-0.5">Since her last calf</div>
            </div>
          </div>
          
          <div className="border-t border-ink/10 pt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Yesterday</div>
              <div className="text-lg font-black text-ink-strong">
                {isLoading ? <Skeleton className="h-5 w-16" /> : animal.yesterdayYield}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">7-Day Avg</div>
              <div className="text-lg font-black text-brand">
                {isLoading ? <Skeleton className="h-5 w-16" /> : animal.sevenDayAvg}
              </div>
            </div>
          </div>
        </div>

        {/* 4. BREEDING STATUS */}
        <div className="card-machined bg-surface p-6 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">
              Breeding Status
            </div>
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Pregnancy Status</div>
              <div className={`text-xl font-black ${animal.pregnancyStatus === 'Not Pregnant' ? 'text-danger' : 'text-brand'}`}>
                {isLoading ? <Skeleton className="h-6 w-24" /> : animal.pregnancyStatus}
              </div>
              {!isLoading && animal.pregnancyStatus === 'Not Pregnant' && (
                <div className="text-[11px] font-bold text-danger mt-0.5">Needs AI Session</div>
              )}
            </div>
          </div>
          <div className="border-t border-ink/10 pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Days Since Calving</div>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <Skeleton className="h-4 w-8" />
              ) : (
                <span className="text-sm font-bold text-ink-strong">{animal.daysOpen}</span>
              )}
              {!isLoading && <span className="text-xs font-bold text-ink-muted">Days</span>}
            </div>
          </div>
        </div>

      </div>

      {/* ── TIMELINE / NUTRITION PLANNER SECTION ── */}
      <div className="card-machined p-6 bg-surface-warm/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-brand flex items-center gap-2">
            <Calendar size={18} /> {activeTab === 'timeline' ? "Cow History" : "Nutrition Planner"}
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'timeline' ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'nutrition' ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5'
              }`}
            >
              Target Feed Calculator
            </button>
            {activeTab === 'timeline' && (
              <button
                onClick={() => setIsEventOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm transition-colors hover:bg-brand/5"
              >
                <Plus size={14} /> Log Action
              </button>
            )}
          </div>
        </div>

        {activeTab === 'timeline' ? (
          <>
            <div className="flex flex-wrap items-center justify-between mb-8 gap-4 border-b border-ink/10 pb-4">
              <div className="flex items-center gap-2 bg-surface-raised p-1 rounded-lg border border-ink/10">
                <Filter size={14} className="text-ink-muted ml-2 mr-1" />
                {['All', 'Health', 'Breeding', 'General'].map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveFilter(category)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      activeFilter === category 
                        ? 'bg-brand text-surface shadow-sm' 
                        : 'text-ink-muted hover:bg-ink/5'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative space-y-8 pl-4 md:pl-8 before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gradient-to-b before:from-brand/25 before:via-brand/20 before:to-transparent md:before:left-8">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="relative flex items-start group">
                    <div className="absolute left-[-22px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface transition-transform md:left-[-34px]"> 
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                    <div className="ml-6 md:ml-4 w-full">
                      <div className="rounded-xl border border-ink/10 bg-surface p-4 transition-colors hover:bg-surface-raised">
                        <div className="flex justify-between items-center mb-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                filteredEvents.map((event) => (
                  <TimelineEventCard key={event.id} event={event} />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="bg-surface p-6 rounded-2xl border border-ink/10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6 lg:border-r lg:border-ink/10 lg:pr-8">
                <div>
                  <h5 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">{LABELS.CURRENT_PRODUCTION}</h5>
                  <p className="text-2xl font-black text-ink">{animal.peakYield.split(' ')[0]} <span className="text-sm text-ink-muted font-semibold">L/day</span></p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-ink-muted uppercase tracking-wider block mb-1.5">{LABELS.TARGET_MILK} (L/day)</label>
                    <input type="number" placeholder="e.g. 30" value={targetYield} onChange={(e) => setTargetYield(e.target.value)} className="w-full p-2.5 bg-surface border border-ink/20 rounded-lg focus:outline-none focus:border-brand transition-colors text-ink font-medium" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5 truncate" title="Period (Days)">{LABELS.PERIOD_DAYS}</label>
                      <input type="number" value={horizonDays} onChange={e => setHorizonDays(Number(e.target.value))} className="w-full p-2.5 bg-surface border border-ink/20 rounded-lg focus:outline-none focus:border-brand text-ink font-medium" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5 truncate" title="Meal Ratio (kg/L)">{LABELS.MEAL_RATIO}</label>
                      <input type="number" step="0.1" value={feedEfficiency} onChange={e => setFeedEfficiency(Number(e.target.value))} className="w-full p-2.5 bg-surface border border-ink/20 rounded-lg focus:outline-none focus:border-brand text-ink font-medium" />
                      <p className="text-[9px] text-ink-muted mt-1 leading-tight">Usually 0.3 - 0.7</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5 truncate" title="Feed Price (KES/kg)">{LABELS.PRICE_PER_KG}</label>
                      <input type="number" placeholder="e.g. 60" value={feedPrice} onChange={(e) => setFeedPrice(Number(e.target.value))} className="w-full p-2.5 bg-surface border border-ink/20 rounded-lg focus:outline-none focus:border-brand text-ink font-medium" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => {
                    const current = parseFloat((animal.peakYield || '0').toString().replace(/[^0-9.]/g, '')) || 0;
                    const target = Number(targetYield);
                    if (!target || target <= current) {
                      setPlannerResult({ error: 'Target production must be greater than current peak production.' });
                      return;
                    }

                    const extraLitresPerDay = Math.max(0, target - current);
                    const extraFeedPerDayKg = extraLitresPerDay * feedEfficiency;
                    const totalExtraFeedKg = extraFeedPerDayKg * horizonDays;
                    const totalCost = totalExtraFeedKg * feedPrice;

                    setPlannerResult({
                      current,
                      target,
                      extraLitresPerDay: Number(extraLitresPerDay.toFixed(1)),
                      extraFeedPerDayKg: Number(extraFeedPerDayKg.toFixed(1)),
                      totalExtraFeedKg: Number(totalExtraFeedKg.toFixed(1)),
                      totalCost: Number(totalCost.toFixed(2)),
                      horizonDays
                    });
                  }} className="bg-brand text-surface px-6 py-2.5 rounded-lg font-bold hover:bg-brand-dark transition-colors flex-1 flex justify-center items-center gap-2"><Calculator size={18} /> Calculate</button>
                  <button onClick={() => { setTargetYield(''); setPlannerResult(null); }} className="px-6 py-2.5 rounded-lg font-bold text-ink-muted border border-ink/20 hover:bg-ink/5 transition-colors">Reset</button>
                </div>
              </div>

              <div className="flex flex-col h-full min-h-[250px]">
                <h5 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-4">Results</h5>
                <div className="flex-1 rounded-xl border border-dashed border-ink/20 bg-surface-warm/30 flex flex-col items-center justify-center p-8 text-center">
                  {!plannerResult && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center mb-4 text-ink-muted"><Calculator size={24} /></div>
                      <p className="text-sm font-semibold text-ink">{LABELS.READY_TO_CALCULATE_TITLE}</p>
                      <p className="text-xs text-ink-muted mt-1 max-w-[200px]">{LABELS.READY_TO_CALCULATE_DESC}</p>
                    </>
                  )}

                {plannerResult && plannerResult.error && (
                  <div className="text-danger font-bold">{plannerResult.error}</div>
                )}

                {plannerResult && !plannerResult.error && (
                  <div className="space-y-2 text-sm w-full">
                    <div className="flex justify-between items-center py-2 border-b last:border-b-0"><span className="text-ink-muted">{LABELS.CURRENT_MILK}</span><strong className="font-mono">{plannerResult.current.toLocaleString(undefined,{maximumFractionDigits:2})} L/day</strong></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-ink-muted">{LABELS.TARGET_MILK}</span><strong className="font-mono">{plannerResult.target.toLocaleString(undefined,{maximumFractionDigits:2})} L/day</strong></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-ink-muted">Extra Litres / day</span><strong className="font-mono">{plannerResult.extraLitresPerDay.toLocaleString(undefined,{maximumFractionDigits:2})} L</strong></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-ink-muted">{LABELS.EXTRA_DAIRY_MEAL}</span><strong className="font-mono">{plannerResult.extraFeedPerDayKg.toLocaleString(undefined,{maximumFractionDigits:2})} kg</strong></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-ink-muted">{LABELS.TOTAL_EXTRA_DAIRY_MEAL} ({plannerResult.horizonDays} days)</span><strong className="font-mono">{plannerResult.totalExtraFeedKg.toLocaleString(undefined,{maximumFractionDigits:2})} kg</strong></div>
                    <div className="flex justify-between items-center py-2"><span className="text-ink-muted">{LABELS.ESTIMATED_COST}</span><strong className="font-mono">{feedCurrency ? `${feedCurrency} ${plannerResult.totalCost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : plannerResult.totalCost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LOG ACTION MODAL ── */}
      <Modal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} title="Log Action">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleAddTimelineEvent(newEvent);
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Event Type</label>
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
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Title</label>
            <input
              className="input-machined w-full"
              value={newEvent.title}
              onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Vet check completed"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Date</label>
            <input
              type="date"
              className="input-machined w-full"
              value={newEvent.date}
              onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Description</label>
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
              className="rounded-lg border border-ink/20 px-4 py-2 text-sm font-bold text-ink-muted transition-colors hover:bg-ink/5"
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