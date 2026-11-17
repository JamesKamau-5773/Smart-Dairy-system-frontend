import { OUTCOME_LABELS } from '../../lib/breedingHistory';

// Calm tones: only a confirmed pregnancy is tinted (brand). The label carries the meaning,
// so no status rests on colour alone; pending checks get a dashed edge.
const STATUS_TONES = {
  Pregnant: 'border-brand/30 bg-brand/5 text-brand',
  Open: 'border-ink/20 bg-ink-50 text-ink-700',
  Failed: 'border-ink/20 bg-ink-50 text-ink-600',
  Pending: 'border-dashed border-ink/30 bg-card text-ink-600',
};

const SOURCE_LABELS = {
  vet_provided: 'Vet Provided',
  farm_stock: 'Farm Stock',
  unknown: 'Unknown Source',
};

/** A breeding record's status, e.g. "Pregnant (In-Calf)". `status` is the normalized backend status. */
export function BreedingStatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONES[status] ?? STATUS_TONES.Pending}`}>
      {OUTCOME_LABELS[status] ?? OUTCOME_LABELS.Pending}
    </span>
  );
}

/** Where the semen came from. Context, not a status, so one neutral style for every source. */
export function SemenSourceBadge({ source }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-md border border-ink/15 bg-card px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink-600">
      {SOURCE_LABELS[source] ?? SOURCE_LABELS.farm_stock}
    </span>
  );
}
