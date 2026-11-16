import { formatCostPerLitre } from '../../lib/feedCost';
import { hasRowsToShow } from '../../lib/listLoadState';
import { ListLoadNotices } from '../ui/ListLoadState';
import Skeleton from '../ui/Skeleton';
import { feedCopy } from '../../i18n/feed';

const TITLE = 'Feed cost per litre of milk';
const SUBTITLE = 'How much of your milk money goes to buying feed. Lower is better.';

/** Bar height as a share of the most expensive week; unknown weeks draw no bar. */
const barPercent = (cost, max) => (cost === null || !(max > 0) ? 0 : Math.max(4, Math.round((cost / max) * 100)));
const SKELETON_BARS = ['h-1/3', 'h-1/2', 'h-2/3', 'h-2/5', 'h-3/4'];

/**
 * Weekly feed cost per litre, as the backend computed it.
 * @param {object} props
 * @param {Array<{ week: string, cost: number|null, isCurrent: boolean }>} props.trends
 * @param {'loading'|'offline'|'error'|'stale'|'ready'} [props.state] Load state of the trend
 *   (`getListLoadState`); "no data yet" only shows once it has loaded.
 * @param {unknown} [props.error]
 * @param {() => void} [props.onRetry]
 */
export default function ProfitabilityChart({ trends, state = 'ready', error, onRetry }) {
  const points = Array.isArray(trends) ? trends : [];
  const max = Math.max(0, ...points.map((point) => point.cost ?? 0));

  return (
    <section className="card-machined flex flex-col p-5 sm:p-6" aria-label={TITLE}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {TITLE}
      </h3>

      {state !== 'ready' && (
        <div className="-mx-5 mt-3 sm:-mx-6">
          <ListLoadNotices state={state} label={feedCopy.costs.weeklyLabel} error={error} onRetry={onRetry} />
        </div>
      )}
      {state === 'loading' && (
        <div className="mt-4 flex h-28 items-end justify-between gap-2" aria-hidden="true">
          {SKELETON_BARS.map((height) => <Skeleton key={height} className={`w-full max-w-[40px] ${height}`} />)}
        </div>
      )}
      {!hasRowsToShow(state) ? null : points.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{feedCopy.costs.noWeekly}</p>
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
