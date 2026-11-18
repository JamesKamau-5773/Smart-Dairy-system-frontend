import { Plus } from 'lucide-react';
import { productionCopy } from '../../i18n/production';

/**
 * The Production Log's heading block: the page's one <h1>, description and the two
 * actions (the app's secondary and primary buttons; only the create action has an icon).
 */
export default function ProductionLogHeader({ onRecordMilk, onFeedCalf }) {
  const copy = productionCopy;
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1 className="m-0 mb-2 text-page-title text-ink-900">
          <span className="text-brand">{copy.heading.lead}</span> {copy.heading.rest}
        </h1>
        <p className="m-0 text-body text-ink-500">{copy.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onFeedCalf} className="btn-secondary min-h-11 gap-2 px-4">
          {copy.feedCalf}
        </button>
        <button type="button" onClick={onRecordMilk} className="btn-command min-h-11 gap-2 px-4">
          <Plus size={16} aria-hidden="true" /> {copy.recordMilk}
        </button>
      </div>
    </header>
  );
}
