import { TrendingDown } from 'lucide-react';
import { formatCostPerLitre } from '../../lib/feedCost';

const TITLE = 'Feed cost per litre of milk';
const SUBTITLE = 'How much of your milk money goes to buying feed. Lower is better.';

/** Bar height as a share of the most expensive week; unknown weeks draw no bar. */
const barPercent = (cost, max) => (cost === null || !(max > 0) ? 0 : Math.max(4, Math.round((cost / max) * 100)));

export default function ProfitabilityChart({ trends }) {
  const points = Array.isArray(trends) ? trends : [];
  const max = Math.max(0, ...points.map((point) => point.cost ?? 0));

  return (
    <section className="card-machined flex flex-col p-5 sm:p-6" aria-label={TITLE}>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        <TrendingDown size={16} aria-hidden="true" /> {TITLE}
      </h3>

      {points.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">No weekly cost data yet. It appears once batches are fed and milk is recorded.</p>
      ) : (
        <>
          <p className="mt-1 border-b border-ink/10 pb-4 text-xs text-ink-muted">{SUBTITLE}</p>
          <ol className="mt-4 flex min-h-[180px] items-end justify-between gap-2">
            {points.map((point) => (
              <li key={point.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className={`mb-1.5 font-mono text-[11px] font-semibold tabular-nums ${point.isCurrent ? 'text-ink' : 'text-ink-muted'}`}>
                  {formatCostPerLitre(point.cost, { suffix: '' })}
                </span>
                <div className="flex h-28 w-full max-w-[40px] items-end">
                  <div
                    className={`w-full rounded-t-sm ${point.isCurrent ? 'bg-brand' : 'bg-brand-100'}`}
                    style={{ height: `${barPercent(point.cost, max)}%` }}
                  />
                </div>
                <span className={`mt-2 truncate text-[11px] font-semibold ${point.isCurrent ? 'text-ink' : 'text-ink-muted'}`}>{point.week}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
