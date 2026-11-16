import { commonCopy } from '../../i18n/common';

/** Tells the farmer a form was refilled from a saved draft, with a way to start again. */
export default function DraftRestoredNotice({ onStartOver, onDismiss }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
      <span>{commonCopy.draft.restored}</span>
      <span className="flex gap-3">
        <button type="button" onClick={onStartOver} className="font-semibold text-brand-800 hover:underline">{commonCopy.draft.startOver}</button>
        {onDismiss && <button type="button" onClick={onDismiss} className="text-ink-muted hover:underline">{commonCopy.draft.ok}</button>}
      </span>
    </div>
  );
}
