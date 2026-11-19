import { Link } from 'react-router-dom';
import KpiCard from './KpiCard';
import { getApiErrorMessage } from '../../lib/backendApi';
import { commonCopy } from '../../i18n/common';

// 'tiles': equal columns for any number of cards from sm up; one card per line on phones.
// 'list': one card per row group, a line per figure with hairline dividers.
const ROW_STYLES = {
  tiles: {
    default: 'grid gap-2 sm:auto-cols-fr sm:grid-flow-col',
    emphasis: 'grid gap-2 rounded-card bg-brand-900 p-2 sm:auto-cols-fr sm:grid-flow-col',
  },
  list: {
    default: 'divide-y divide-ink/10 rounded-card border border-ink/10 bg-card px-4',
    emphasis: 'divide-y divide-brand-800 rounded-card bg-brand-900 px-4',
  },
};
const CARD_LAYOUT = { tiles: 'tile', list: 'row' };
const Block = ({ className }) => <div aria-hidden="true" className={`rounded-badge bg-ink/5 ${className}`} />;

function Retry({ onRetry }) {
  return (
    <button type="button" onClick={() => onRetry?.()} className="inline-flex min-h-11 shrink-0 items-center text-control text-brand hover:underline sm:min-h-8">
      {commonCopy.list.tryAgain}
    </button>
  );
}

/**
 * A page's KPI section: rows of KpiCards from a config, with the scope on the left and a
 * "View full report" link on the right above them. Presentational: the page's data hook
 * supplies the values and the load state; the config says what each card shows.
 *
 * rows:      [{ variant: 'default' | 'emphasis', items: [{ key, label, info?, render(values) }] }]
 * values:    the page's KPI view model, or null before it has loaded
 * scope:     what the figures cover ("2026"): "Totals for 2026" ('tiles') or "Summary · 2026" ('list')
 * reportTo:  the full report's route
 * loadState: 'loading' | 'ready' | 'stale' | 'error' | 'offline'
 * layout:    'tiles' (cards side by side) | 'list' (label-left / value-right rows, for phones)
 */
export default function KpiGroup({ label, rows, values, scope, reportTo, loadState, error, onRetry, layout = 'tiles' }) {
  const hasData = Boolean(values);
  const rowStyles = ROW_STYLES[layout] ?? ROW_STYLES.tiles;
  const isList = layout === 'list';

  let body;
  if (!hasData && loadState === 'loading') {
    body = (
      <div aria-busy="true" className="space-y-2">
        {rows.map((row) => (
          <div key={row.variant} className={ROW_STYLES.tiles.default}>
            {row.items.map((item) => (
              <div key={item.key} className="space-y-2 rounded-input border border-ink/10 bg-card px-4 py-3"><Block className="h-3 w-20" /><Block className="h-6 w-28" /></div>
            ))}
          </div>
        ))}
      </div>
    );
  } else if (!hasData && loadState === 'offline') {
    body = <p role="status" className="text-body text-ink">{commonCopy.summary.offline}</p>;
  } else if (!hasData) {
    body = (
      <div role="alert" className="flex min-w-0 flex-wrap items-center gap-x-3 text-body text-ink">
        <span className="min-w-0">{commonCopy.summary.loadFailed} {getApiErrorMessage(error, commonCopy.list.errorDetail)}</span>
        <Retry onRetry={onRetry} />
      </div>
    );
  } else {
    body = (
      <div className="space-y-2">
        {rows.map((row) => (
          <dl key={row.variant} className={`m-0 ${rowStyles[row.variant] ?? rowStyles.default}`}>
            {row.items.map((item) => (
              <KpiCard key={item.key} label={item.label} info={item.info} value={item.render(values)} variant={row.variant} layout={CARD_LAYOUT[layout]} />
            ))}
          </dl>
        ))}
      </div>
    );
  }

  return (
    <section aria-label={label} className="space-y-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4">
        {isList
          ? <p className="m-0 text-label text-ink-muted">{scope ? commonCopy.summary.caption(scope) : null}</p>
          : <p className="text-meta text-ink-muted">{scope && hasData ? commonCopy.summary.scope(scope) : null}</p>}
        {reportTo && (
          <Link to={reportTo} className="inline-flex min-h-11 items-center text-body-strong text-brand hover:underline sm:min-h-8">
            {commonCopy.summary.fullReport}
          </Link>
        )}
      </div>
      {body}
      {loadState === 'stale' && hasData && (
        <div role="status" className="flex flex-wrap items-center gap-x-2 text-meta text-ink-muted">
          <span>{commonCopy.summary.refreshFailed} {getApiErrorMessage(error, commonCopy.summary.checkConnection)}</span>
          <Retry onRetry={onRetry} />
        </div>
      )}
    </section>
  );
}
