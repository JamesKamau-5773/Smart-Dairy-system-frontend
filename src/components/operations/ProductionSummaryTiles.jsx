import Skeleton from '../ui/Skeleton';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { productionCopy } from '../../i18n/production';

function Tile({ label, isLoading, children }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-ink/10 bg-card p-5 shadow-sm">
      <dt className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="m-0 flex items-baseline gap-2 font-mono text-3xl font-bold tabular-nums">
        {isLoading ? <Skeleton className="h-9 w-24" /> : children}
      </dd>
    </div>
  );
}

/**
 * The Production Log's four totals, for the same filters and dates as the table. Every
 * figure is the backend's: litres from the production summary, the status counts from the
 * milk list's summary. A figure the backend didn't send shows "—".
 *
 * litres:  summary `current.litres` (string or null)      litresLoading: summary still loading
 * counts:  { verified, pending, flagged } or null          countsLoading: counts still loading
 */
export default function ProductionSummaryTiles({ litres, litresLoading = false, counts, countsLoading = false }) {
  const copy = productionCopy.tiles;
  const total = formatLitres(litres, { unit: false });
  return (
    <section aria-label={copy.label} className="rounded-2xl border border-brand/10 bg-brand-50/50 p-6">
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={copy.totalVolume} isLoading={litresLoading}>
          <span className="text-brand">{total}</span>
          {total !== '—' && <span className="font-sans text-lg font-semibold text-brand/70">L</span>}
        </Tile>
        <Tile label={copy.verified} isLoading={countsLoading}>
          <span className="text-brand">{formatCount(counts?.verified)}</span>
        </Tile>
        <Tile label={copy.pending} isLoading={countsLoading}>
          <span className="text-brand">{formatCount(counts?.pending)}</span>
        </Tile>
        <Tile label={copy.flagged} isLoading={countsLoading}>
          <span className="text-ink-900">{formatCount(counts?.flagged)}</span>
        </Tile>
      </dl>
    </section>
  );
}
