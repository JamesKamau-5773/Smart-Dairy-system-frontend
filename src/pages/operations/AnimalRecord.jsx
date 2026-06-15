import React, { useState } from 'react';
import { 
  Activity, Syringe, Baby, Calendar, Droplets, 
  HeartPulse, ShieldCheck, FileText, Filter, ArrowLeft, Download, Share2, Calculator
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '../../components/ui';
import AlertBanner from '../../components/ui/AlertBanner';
import LABELS from '../../lib/labels';

export default function AnimalPassport() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Nutrition planner state
  const [targetYield, setTargetYield] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [feedEfficiency, setFeedEfficiency] = useState(0.5); // kg extra feed per extra litre/day
  const [feedPrice, setFeedPrice] = useState(60); // price per kg (local currency)
  const [feedCurrency, setFeedCurrency] = useState('KES'); // 
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

    const text = `Hello, here is the official Certified Official Cow Record for ${animal.id} (${animal.name}).

Breed: ${animal.breed}
Best Daily Milk: ${animal.peakYield}

View the verified medical passport here: ${publicVerifyLink}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Mock Data: Animal Profile
  const animal = {
    id: id || "C-101",
    name: "Luna",
    breed: "75% Friesian (Graded Up)",
    age: "3 Years, 2 Months",
    status: "Active Milker",
    peakYield: "26.5 L/day",
    sire: "FR-889 (Premium AI)",
    dam: "C-042 (Bella)"
  };

  // Mock Data: Lifetime Chronological Events
  const events = [
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
  ];

  // Filter Logic
  const filteredEvents = events.filter(event => 
    activeFilter === 'All' || event.type === activeFilter
  );

  return (
    <div className="animate-reveal space-y-6 max-w-5xl mx-auto">
      
      {/* NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/operations/records" className="p-2 hover:bg-surface-raised rounded-lg text-ink-muted transition-colors">
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
            className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#1DA851] transition-colors flex items-center gap-2"
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

      {/* ANIMAL PROFILE HERO */}
      <div className="card-machined p-6 bg-surface grid grid-cols-1 md:grid-cols-4 gap-6">
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
            <AlertBanner type="success" title="Done" message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
          </div>
        )}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <div>
            <span className="block text-[10px] font-bold text-ink/50 uppercase tracking-widest">{LABELS.BREED_PARENTS}</span>
            <div className="text-lg font-bold text-brand">{isLoading ? <Skeleton className="h-6 w-48" /> : animal.breed}</div>
            <div className="text-xs text-ink-muted mt-1 font-mono">{isLoading ? <Skeleton className="h-4 w-56" /> : `Sire: ${animal.sire} | Dam: ${animal.dam}`}</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <span className="block text-[10px] font-bold text-ink/50 uppercase tracking-widest">Age & Status</span>
            <div className="text-base font-bold text-ink">{isLoading ? <Skeleton className="h-5 w-24" /> : animal.age}</div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 bg-accent/20 text-brand-dark text-xs font-bold rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> {animal.status}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-[10px] font-bold text-ink/50 uppercase tracking-widest">{LABELS.BEST_DAILY_MILK}</span>
            <div className="text-2xl font-bold text-brand">{isLoading ? <Skeleton className="h-8 w-32" /> : animal.peakYield}</div>
            <div className="text-xs text-ink-muted mt-1">{LABELS.BEST_DAILY_MILK_SUB}</div>
          </div>
        </div>
      </div>

      {/* TIMELINE / NUTRITION PLANNER SECTION */}
      <div className="card-machined p-6 bg-surface-warm/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-brand flex items-center gap-2">
            <Calendar size={18} /> {activeTab === 'timeline' ? LABELS.COW_HISTORY : LABELS.NUTRITION_PLANNER}
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
              {LABELS.TARGET_FEED_CALCULATOR}
            </button>
          </div>
        </div>

        {activeTab === 'timeline' ? (
          <>
            {/* Filters */}
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

            {/* Vertical Timeline */}
            <div className="relative pl-4 md:pl-8 space-y-8 before:absolute before:inset-0 before:ml-5 md:before:ml-9 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand/20 before:via-brand/20 before:to-transparent">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="relative flex items-start group">
                    <div className={`absolute left-[-22px] md:left-[-34px] w-8 h-8 rounded-full border-2 flex items-center justify-center bg-surface z-10 transition-transform`}> 
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                    <div className="ml-6 md:ml-4 w-full">
                      <div className="p-4 rounded-xl border bg-surface hover:bg-surface-raised transition-colors">
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
                  <div key={event.id} className="relative flex items-start group">
                    <div className={`absolute left-[-22px] md:left-[-34px] w-8 h-8 rounded-full border-2 flex items-center justify-center bg-surface z-10 transition-transform group-hover:scale-110 ${event.color}`}>
                      {event.icon}
                    </div>

                    <div className="ml-6 md:ml-4 w-full">
                      <div className={`p-4 rounded-xl border bg-surface hover:bg-surface-raised transition-colors ${event.color.split(' ')[2]}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-1">
                          <h4 className="font-bold text-ink text-sm md:text-base">{event.title}</h4>
                          <span className="font-mono text-xs text-ink-muted bg-surface-warm px-2 py-0.5 rounded">
                            {event.date}
                          </span>
                        </div>
                        <p className="text-sm text-ink-muted leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}