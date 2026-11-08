import { CloudOff, Filter, RefreshCw } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/backendApi';
import { formatAsOfTime } from '../../lib/numberFormat';
import { SURFACE } from '../data/surface';

const Block = ({ className }) => <div aria-hidden="true" className={`rounded-badge bg-ink/5 ${className}`} />;

// Equal columns, as many as there are metrics (two per row on phones past three).
const GRID_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-5',
};

function Retry({ onRetry, size = 12 }) {
  return (
    <button type="button" onClick={() => onRetry?.()} className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-brand hover:underline">
      <RefreshCw size={size} aria-hidden="true" /> Try again
    </button>
  );
}

/**
 * Primary metrics in equal columns with dividers. metric: { key, label, value, sub?, mono? }.
 * Values render as given (money brings its own monospace); others stay sans, with the
 * tabular figures the body sets (the global .tabular-nums class would make them monospace).
 */
function MetricGrid({ metrics, muted }) {
  // Phones show two per row from four metrics up, so a divider starts each column but the first.
  const phoneColumns = metrics.length >= 4 ? 2 : metrics.length;
  return (
    <dl className={`grid gap-y-3 ${GRID_COLUMNS[metrics.length] ?? GRID_COLUMNS[5]}`}>
      {metrics.map((metric, index) => (
        <div key={metric.key} className={`min-w-0 border-ink/10 pr-3 ${index % phoneColumns ? 'border-l pl-3' : ''} ${index > 0 ? 'sm:border-l sm:pl-4' : 'sm:border-l-0 sm:pl-0'}`}>
          <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{metric.label}</dt>
          <dd className={`mt-1 truncate text-lg font-semibold sm:text-xl ${metric.mono ? 'font-mono' : ''} ${muted ? 'text-ink-muted' : 'text-ink'}`}>{metric.value}</dd>
          {metric.sub !== undefined && <dd className="mt-0.5 min-h-4 text-xs leading-4 text-ink-muted lg:truncate">{metric.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Smaller figures that each state their own scope. item: { key, label, value }. */
function SecondaryRow({ items }) {
  if (!items?.length) return null;
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/10 pt-3 text-sm">
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 items-baseline gap-2">
          <dt className="text-xs text-ink-muted">{item.label}</dt>
          <dd className="min-w-0 truncate font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Period totals at the top of a page: header row (label + period control), primary
 * metrics, an optional secondary row and an optional chart. Presentational: the page
 * builds every item from the API view model and owns the period.
 */
export default function PeriodSummary({
  title,
  control,
  scopeNote,
  loadState,
  hasData,
  isEmpty = false,
  error,
  asOf,
  onRetry,
  metrics = [],
  secondary = [],
  chart = null,
  emptyMessage = null,
  skeletonCount = 4,
}) {
  const asOfTime = formatAsOfTime(asOf);

  let body;
  if (loadState === 'loading' && !hasData) {
    body = (
      <div className="space-y-3" aria-busy="true">
        <div className={`grid gap-x-4 ${GRID_COLUMNS[skeletonCount] ?? GRID_COLUMNS[4]}`}>
          {Array.from({ length: skeletonCount }, (_, index) => <div key={index} className="space-y-1.5"><Block className="h-2.5 w-16" /><Block className="h-6 w-28" /></div>)}
        </div>
        <Block className="h-3 w-40" />
      </div>
    );
  } else if (!hasData && loadState === 'offline') {
    body = (
      <p role="status" className="flex items-start gap-2 rounded-input border border-ink/10 bg-ink-50 p-3 text-sm text-ink">
        <CloudOff size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
        You’re offline and these totals haven’t been saved on this phone yet. They will load when your connection returns.
      </p>
    );
  } else if (!hasData) {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-ink/10 bg-ink-50 p-3 text-sm text-ink">
        <span className="min-w-0">Couldn’t load totals. {getApiErrorMessage(error, 'Check your connection and try again.')}</span>
        <Retry onRetry={onRetry} size={14} />
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <MetricGrid metrics={metrics} muted={isEmpty} />
        {isEmpty && emptyMessage && <div className="text-xs text-ink-muted">{emptyMessage}</div>}
        <SecondaryRow items={secondary} />
        {!isEmpty && chart}
        {loadState === 'stale' && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <span>Couldn’t refresh. {getApiErrorMessage(error, 'Check your connection.')}</span>
            <Retry onRetry={onRetry} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section aria-label={title} className={`${SURFACE} space-y-4 p-3 sm:p-4`}>
      {/* Without a label the period control leads the row, as on the Production Log. */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {(title || scopeNote || asOfTime) && (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>}
            {scopeNote && (
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-ink-muted">
                <Filter size={12} aria-hidden="true" className="shrink-0" /><span className="truncate">{scopeNote}</span>
              </span>
            )}
            {asOfTime && <span className="text-xs text-ink-muted">As of {asOfTime}</span>}
          </div>
        )}
        {control}
      </div>
      {body}
    </section>
  );
}
