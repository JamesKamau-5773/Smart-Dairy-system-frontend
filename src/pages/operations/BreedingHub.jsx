import React, { useState } from 'react';
import AlertBanner from '../../components/ui/AlertBanner';
import {
  Dna,
  CalendarDays,
  TrendingUp,
  Syringe,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  XCircle,
  Clock,
} from 'lucide-react';

const breedingAlerts = [
  { cowId: 'C-102 (Luna)', status: 'On Heat Today', urgency: 'High', action: 'Serve before 6:00 PM' },
];

const bullStock = [
  { name: 'KAGRC Premium Friesian', code: 'FR-889', strawsLeft: 4, improves: 'More Milk Volume' },
  { name: 'Highland Ayrshire', code: 'AY-201', strawsLeft: 2, improves: 'Higher Butterfat (%)' },
];

const initialPdQueue = [
  {
    id: 'log_8x9',
    cowId: 'C-104 (Daisy)',
    aiDate: '2026-04-10',
    sireCode: 'FR-889',
    daysPostAI: 46,
    status: 'Needs Checking',
  },
  {
    id: 'log_2b4',
    cowId: 'C-105 (Bella)',
    aiDate: '2026-04-25',
    sireCode: 'AY-201',
    daysPostAI: 31,
    status: 'Wait for 45 Days',
  },
];

function isReadyForPdCheck(daysPostAI) {
  return daysPostAI >= 45;
}

function PdQueueItem({ log, onOutcome }) {
  const readyForCheck = isReadyForPdCheck(log.daysPostAI);

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors md:flex-row md:items-center md:justify-between ${
        readyForCheck ? 'border-brand/20 bg-brand/5' : 'border-ink/5 bg-surface-warm/30'
      }`}
    >
      <div>
        <h4 className="font-bold text-base text-brand">{log.cowId}</h4>
        <div className="mt-1 flex gap-3 font-mono text-xs text-ink-muted">
          <span>Served on: {log.aiDate}</span>
          <span aria-hidden="true">•</span>
          <span>Bull: {log.sireCode}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden text-right md:block">
          <span className="block text-[10px] font-bold uppercase text-ink-muted">Days Since AI</span>
          <span className={`text-lg font-bold ${readyForCheck ? 'text-brand' : 'text-ink/40'}`}>
            {log.daysPostAI}
          </span>
        </div>

        {readyForCheck ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOutcome(log.id, 'Not Pregnant')}
              className="flex items-center gap-1 rounded border border-danger/20 px-3 py-2 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
            >
              <XCircle size={14} /> Not Pregnant
            </button>
            <button
              type="button"
              onClick={() => onOutcome(log.id, 'In-Calf')}
              className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-xs font-bold text-surface shadow-sm transition-colors hover:bg-brand-dark"
            >
              <CheckCircle2 size={14} /> Confirmed In-Calf
            </button>
          </div>
        ) : (
          <div className="rounded border border-ink/10 bg-surface-raised px-3 py-2 text-xs font-bold italic text-ink/40">
            Wait {45 - log.daysPostAI} days for vet
          </div>
        )}
      </div>
    </div>
  );
}

export default function BreedingHub() {
  const [pdQueue, setPdQueue] = useState(initialPdQueue);
  const [infoMessage, setInfoMessage] = useState('');

  const handlePdOutcome = (logId, outcome) => {
    setInfoMessage(`Saved cow as ${outcome}`);
    setPdQueue((currentQueue) => currentQueue.filter((log) => log.id !== logId));
  };

  return (
    <div className="animate-reveal space-y-8">
      {infoMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type="info" title="Update" message={infoMessage} autoDismiss={2400} onDismiss={() => setInfoMessage('')} />
        </div>
      )}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Dna size={12} /> Cow Breeding
          </div>
          <h2 className="m-0 font-sans text-3xl font-bold tracking-tight text-brand">
            AI & <span className="text-ink-muted">Pregnancy</span>
          </h2>
          <p className="mt-2 font-mono text-xs text-ink-muted">Track AI dates, vet checks, and calf records.</p>
        </div>
        <button className="btn-command flex items-center gap-2 text-sm bg-accent text-brand hover:bg-brand hover:text-surface">
          <Syringe size={16} /> Record AI (Serve)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card-machined bg-surface p-6 text-ink-strong">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-brand">
              <CalendarDays size={20} className="text-accent" /> Cows on Heat (Needs AI)
            </h3>

            <div className="space-y-4">
              {breedingAlerts.map((alert) => (
                <div
                  key={alert.cowId}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    alert.urgency === 'High' ? 'border-danger/20 bg-danger/5' : 'border-ink/10 bg-surface-warm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={alert.urgency === 'High' ? 'animate-pulse text-danger' : 'text-brand'}>
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand">{alert.cowId}</h4>
                      <p className={alert.urgency === 'High' ? 'text-sm font-medium text-danger' : 'text-sm text-ink-muted'}>
                        {alert.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="mb-1 block text-xs uppercase text-ink-muted">Action Required</span>
                    <span className="text-sm font-semibold text-ink-strong">{alert.action}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full rounded-lg border border-ink/10 py-3 text-sm font-medium text-brand transition-colors hover:bg-surface-raised">
              View Full Breeding Calendar
            </button>
          </div>

          <div className="card-machined border-brand/20 bg-surface p-6 text-ink-strong">
            <div className="mb-6 flex items-end justify-between border-b border-ink/10 pb-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-brand">
                  <Stethoscope size={20} className="text-brand-dark" /> Pregnancy Checks (Vet Visits)
                </h3>
                <p className="mt-1 text-xs text-ink-muted">Cows that need a vet check (45+ days since AI).</p>
              </div>
              <div className="flex items-center gap-2 rounded bg-surface-warm px-3 py-1 text-xs font-bold text-ink-muted">
                <Clock size={14} /> {pdQueue.length} Pending
              </div>
            </div>

            <div className="space-y-4">
              {pdQueue.map((log) => (
                <PdQueueItem key={log.id} log={log} onOutcome={handlePdOutcome} />
              ))}

              {pdQueue.length === 0 ? (
                <div className="py-8 text-center text-sm italic text-ink-muted">
                  All inseminations have been checked by the vet.
                </div>
              ) : null}
            </div>
          </div>

          <div className="card-machined relative overflow-hidden bg-surface/85 p-6 text-ink-strong backdrop-blur-2xl border border-brand/15">
            <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/20 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 scale-150 translate-x-1/4 -translate-y-1/4 opacity-10 text-brand">
              <TrendingUp size={200} />
            </div>
            <div className="relative z-10">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                <CheckCircle2 size={16} className="text-brand" /> Herd Improvement
              </h3>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="mb-1 text-sm text-ink-muted">Daughters' Milk (Heifers)</p>
                  <div className="text-4xl font-bold text-ink-strong">
                    26.5 <span className="text-lg font-medium text-ink-muted">L/day</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-ink-muted">Mothers' Milk</p>
                  <div className="text-4xl font-bold text-ink-strong">
                    22.0 <span className="text-lg font-medium text-ink-muted">L/day</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-4">
                <div className="rounded border border-brand/20 bg-brand/5 px-3 py-1 text-sm font-bold text-brand">
                  + 20% Improvement
                </div>
                <p className="text-sm text-ink-muted">
                  Your bull choices are working. The new heifers are giving more milk than their mothers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-machined bg-surface p-6 h-full text-ink-strong">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-brand">
              <Syringe size={20} className="text-accent" /> AI Semen (Straws) in Stock
            </h3>

            <p className="mb-6 border-b border-ink/10 pb-4 text-xs text-ink-muted">
              Select the right bull based on what you want to improve in your next calf.
            </p>

            <div className="space-y-4">
              {bullStock.map((bull) => (
                <div key={bull.code} className="rounded-lg border border-ink/5 bg-surface-warm p-4 text-ink-strong">
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="text-sm font-bold text-brand">{bull.name}</h4>
                    <span className="inline-block rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                      {bull.strawsLeft} left
                    </span>
                  </div>
                  <div className="mb-3 font-mono text-[10px] text-ink-muted">CODE: {bull.code}</div>

                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase text-ink-muted">Best For:</span>
                    <div className="flex items-center gap-2 text-sm font-medium text-ink-strong">
                      <TrendingUp size={14} className="text-accent" /> {bull.improves}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/20 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand">
              + Add New AI Straws
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}