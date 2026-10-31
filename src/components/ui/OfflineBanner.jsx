import { useState } from 'react';
import { AlertTriangle, CloudOff, Loader2 } from 'lucide-react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import OfflineQueueInspector from './OfflineQueueInspector';

const changes = (count) => `${count} saved ${count === 1 ? 'change' : 'changes'}`;

/** Plain-language connection notice shown above every app page while it matters. */
export default function OfflineBanner() {
  const { online, pendingCount, needsAttentionCount, flushing } = useOfflineQueue();
  const [inspectorOpen, setInspectorOpen] = useState(false);

  let tone;
  let Icon;
  let message;
  if (!online) {
    tone = 'border-warning-500/40 bg-warning-50 text-ink';
    Icon = CloudOff;
    message = (
      <>
        <strong className="font-semibold">You’re offline.</strong>{' '}
        Milk records and other daily work are saved on this phone and sent when you’re back online. Payments and payroll need internet.
        {pendingCount > 0 && <> {changes(pendingCount)} waiting to send.</>}
      </>
    );
  } else if (needsAttentionCount > 0) {
    tone = 'border-danger-500/30 bg-danger-50 text-danger-900';
    Icon = AlertTriangle;
    message = <>{needsAttentionCount === 1 ? '1 saved change' : changes(needsAttentionCount)} couldn’t be sent and {needsAttentionCount === 1 ? 'needs' : 'need'} your attention.</>;
  } else if (pendingCount > 0) {
    tone = 'border-brand-200 bg-brand-50 text-brand-900';
    Icon = Loader2;
    message = <>{flushing ? 'Back online. Sending' : 'Waiting to send'} {changes(pendingCount)}…</>;
  } else {
    return null;
  }

  return (
    <>
      <div role="status" aria-live="polite" className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 text-sm sm:px-6 ${tone}`}>
        <Icon size={16} aria-hidden="true" className={`shrink-0 ${Icon === Loader2 && flushing ? 'animate-spin' : ''}`} />
        <p className="min-w-0 flex-1">{message}</p>
        {pendingCount > 0 && (
          <button type="button" onClick={() => setInspectorOpen(true)} className="shrink-0 text-sm font-semibold text-brand-800 underline-offset-2 hover:underline">
            Review
          </button>
        )}
      </div>
      <OfflineQueueInspector isOpen={inspectorOpen} onClose={() => setInspectorOpen(false)} />
    </>
  );
}
