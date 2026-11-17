import { ClipboardList, Plus } from 'lucide-react';
import { productionCopy } from '../../i18n/production';

/** The Production Log's heading block: eyebrow, title, description and the two actions. */
export default function ProductionLogHeader({ onRecordMilk, onFeedCalf }) {
  const copy = productionCopy;
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
          <ClipboardList size={14} aria-hidden="true" /> {copy.eyebrow}
        </div>
        <h2 className="m-0 mb-2 font-sans text-3xl font-bold tracking-tight text-ink-900">
          <span className="text-brand">{copy.heading.lead}</span> {copy.heading.rest}
        </h2>
        <p className="m-0 text-sm text-ink-500">{copy.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onFeedCalf}
          className="flex min-h-11 items-center gap-2 rounded-md border border-ink-300 bg-card px-4 py-2 text-sm font-semibold text-ink-700 shadow-sm transition-colors hover:bg-ink-50"
        >
          {copy.feedCalf}
        </button>
        <button
          type="button"
          onClick={onRecordMilk}
          className="flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          <Plus size={16} aria-hidden="true" /> {copy.recordMilk}
        </button>
      </div>
    </header>
  );
}
