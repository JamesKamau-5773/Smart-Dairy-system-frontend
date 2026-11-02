import { History } from 'lucide-react';

/** Tells the farmer a form was refilled from a saved draft, with a way to start again. */
export default function DraftRestoredNotice({ onStartOver, onDismiss }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
      <span className="flex items-center gap-2">
        <History size={15} aria-hidden="true" />
        Restored what you were typing before the app closed.
      </span>
      <span className="flex gap-3">
        <button type="button" onClick={onStartOver} className="font-semibold text-brand-800 hover:underline">Start over</button>
        {onDismiss && <button type="button" onClick={onDismiss} className="text-ink-muted hover:underline">OK</button>}
      </span>
    </div>
  );
}
