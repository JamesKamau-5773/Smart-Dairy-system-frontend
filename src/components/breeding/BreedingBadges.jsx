import { outcomeLabel } from '../../lib/breedingHistory';
import { breedingCopy } from '../../i18n/breeding';

// Calm tones: only a confirmed pregnancy is tinted (brand). The label carries the meaning,
// so no status rests on colour alone; pending checks get a dashed edge.
const STATUS_TONES = {
  Pregnant: 'border-brand/30 bg-brand/5 text-brand',
  Open: 'border-ink/20 bg-ink-50 text-ink-700',
  Failed: 'border-ink/20 bg-ink-50 text-ink-600',
  Pending: 'border-dashed border-ink/30 bg-card text-ink-600',
};

/** A breeding record's status, e.g. "Pregnant (in-calf)". `status` is the normalized backend status. */
export function BreedingStatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-badge ${STATUS_TONES[status] ?? STATUS_TONES.Pending}`}>
      {outcomeLabel(status)}
    </span>
  );
}

/** Where the semen came from. Context, not a status, so one neutral style for every source. */
export function SemenSourceBadge({ source }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-md border border-ink/15 bg-card px-2 py-0.5 text-label text-ink-600">
      {breedingCopy.sources[source] ?? breedingCopy.sources.farm_stock}
    </span>
  );
}
