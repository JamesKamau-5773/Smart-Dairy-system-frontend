import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Beef, CheckCircle2, Milk, PartyPopper, Users, X } from 'lucide-react';
import { financeApi, herdApi } from '../../lib/backendApi';
import { checklistKey, checklistView, readFlag, writeFlag } from '../../lib/welcomeProgress';

const toList = (value) => (Array.isArray(value) ? value : []);

/**
 * First-run checklist on the owner dashboard: add a cow, record a milking, add a buyer.
 * Shares query keys with the herd and buyer pages, so finishing a step there updates it here.
 * Remount with `key` when the farm changes.
 */
export default function WelcomeChecklist({ tenantId, farmId, milkRecords, milkLoaded }) {
  const storageKey = checklistKey(tenantId, farmId);
  const [stored, setStored] = useState(() => readFlag(storageKey));
  const finished = stored === 'done' || stored === 'dismissed';

  const herdQuery = useQuery({
    queryKey: ['herd', tenantId, farmId],
    queryFn: () => herdApi.list(),
    enabled: !!farmId && !finished,
  });
  const buyersQuery = useQuery({
    queryKey: ['customers', tenantId, farmId],
    queryFn: () => financeApi.listCustomers().then((res) => res?.items || res?.data || res || []),
    enabled: !!farmId && !finished,
  });

  const loaded = herdQuery.isSuccess && buyersQuery.isSuccess && milkLoaded;
  const steps = [
    {
      id: 'cow',
      title: 'Add your first cow',
      description: 'Her name or tag is enough to start.',
      to: '/operations/herd',
      icon: Beef,
      done: toList(herdQuery.data).length > 0,
    },
    {
      id: 'milk',
      title: 'Record a milking',
      description: 'Log the litres from your next milking.',
      to: '/operations/yield',
      icon: Milk,
      done: toList(milkRecords).length > 0,
    },
    {
      id: 'buyer',
      title: 'Add a buyer',
      description: 'Anyone you sell milk to, with their rate.',
      to: '/finance/buyers',
      icon: Users,
      done: toList(buyersQuery.data).length > 0,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const view = loaded ? checklistView(stored, doneCount === steps.length) : 'loading';

  // Adjust state during render (no extra effect pass); the effect below only persists it.
  if (view === 'checklist' && stored !== 'active') setStored('active');
  if (view === 'mark-done') setStored('done');

  useEffect(() => {
    if (stored) writeFlag(storageKey, stored);
  }, [stored, storageKey]);

  if (view === 'celebrate') {
    return (
      <section aria-labelledby="welcome-done-title" className="card-machined flex flex-col gap-4 bg-brand/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <PartyPopper size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id="welcome-done-title" className="text-xl font-bold text-ink-900">Hongera! Your farm is set up.</h2>
            <p className="mt-1 text-sm text-ink-muted">Cows, milk and buyers are all in. Record every milking and your trends will grow from here.</p>
          </div>
        </div>
        <button type="button" onClick={() => setStored('done')} className="btn-command shrink-0">Done</button>
      </section>
    );
  }

  if (view !== 'checklist') return null;

  const percent = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);

  return (
    <section aria-labelledby="welcome-title" className="card-machined p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="welcome-title" className="text-xl font-bold text-ink-900">Get your farm set up</h2>
          <p className="mt-1 text-sm text-ink-muted">{doneCount} of {steps.length} done. Each step takes a minute or two.</p>
        </div>
        <button
          type="button"
          onClick={() => setStored('dismissed')}
          className="btn-ghost h-11 w-11 shrink-0 border-transparent !p-0"
          aria-label="Hide the setup checklist"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        role="progressbar"
        aria-label="Farm setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-brand-50"
      >
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = step === nextStep;
          return (
            <li key={step.id}>
              {step.done ? (
                <div className="flex items-center gap-4 rounded-card border border-ink/10 bg-surface p-4">
                  <CheckCircle2 size={24} className="shrink-0 text-brand" aria-hidden="true" />
                  <p className="flex-1 font-semibold text-ink-muted">
                    <span className="sr-only">Done: </span>{step.title}
                  </p>
                </div>
              ) : (
                <Link
                  to={step.to}
                  className={`group flex items-center gap-4 rounded-card border p-4 transition-colors ${
                    isNext ? 'border-brand/30 bg-brand/5 hover:bg-brand/10' : 'border-ink/10 bg-surface hover:border-brand/20'
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isNext ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">
                      <span className="sr-only">Step {index + 1}: </span>{step.title}
                    </span>
                    <span className="block text-sm text-ink-muted">{step.description}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
