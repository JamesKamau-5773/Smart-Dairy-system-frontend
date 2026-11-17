import { CloudOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/backendApi';
import { formatAsOfTime } from '../../lib/numberFormat';
import { SURFACE } from './surface';
import { commonCopy } from '../../i18n/common';

const Block = ({ className }) => <div aria-hidden="true" className={`rounded-badge bg-ink/5 ${className}`} />;

function Retry({ onRetry }) {
  return (
    <button type="button" onClick={() => onRetry?.()} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-control text-brand hover:underline sm:min-h-8">
      {commonCopy.list.tryAgain}
    </button>
  );
}

/**
 * One compact row of figures that sums up exactly what the table below shows, with an
 * optional "View full report" link on the right. Presentational: the page's data hook
 * supplies every figure (already formatted, from the API) and the load state.
 *
 * items:     [{ key, label, value }]
 * scope:     what the figures cover, e.g. "Nov 2026" or "01 Oct 2026 – 15 Oct 2026"
 * empty:     shown instead of the figures when the result has no records (never a row of zeros)
 * notice:    shown instead of everything else when the API can't total this view (nothing loads)
 * link:      { to, label? }
 * loadState: 'loading' | 'ready' | 'stale' | 'error' | 'offline'
 */
export default function SummaryStrip({
  label,
  items = [],
  scope,
  empty = null,
  notice = null,
  link,
  loadState,
  hasData,
  error,
  asOf,
  onRetry,
}) {
  const asOfTime = formatAsOfTime(asOf);

  let body;
  if (notice) {
    body = <p role="status" className="text-body text-ink-muted">{notice}</p>;
  } else if (loadState === 'loading' && !hasData) {
    body = (
      <div aria-busy="true" className="flex flex-wrap gap-x-8 gap-y-2">
        {Array.from({ length: Math.max(items.length, 3) }, (_, index) => (
          <div key={index} className="space-y-1.5"><Block className="h-2.5 w-16" /><Block className="h-5 w-24" /></div>
        ))}
      </div>
    );
  } else if (!hasData && loadState === 'offline') {
    body = (
      <p role="status" className="flex items-start gap-2 text-body text-ink">
        <CloudOff size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
        {commonCopy.summary.offline}
      </p>
    );
  } else if (!hasData) {
    body = (
      <div role="alert" className="flex min-w-0 flex-wrap items-center gap-x-3 text-body text-ink">
        <span className="min-w-0">{commonCopy.summary.loadFailed} {getApiErrorMessage(error, commonCopy.list.errorDetail)}</span>
        <Retry onRetry={onRetry} />
      </div>
    );
  } else if (empty) {
    body = <div className="text-body text-ink-muted">{empty}</div>;
  } else {
    // Phones: one figure per line, label left and value right, so a full money figure
    // (symbol and decimals at the stat size) never has to be cut to fit half the width.
    body = (
      <dl className="grid min-w-0 grid-cols-1 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
            <dt className="shrink-0 text-label text-ink-muted">{item.label}</dt>
            <dd className="min-w-0 truncate text-stat-value text-ink sm:mt-0.5">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <section aria-label={label} className={`${SURFACE} flex min-w-0 flex-col gap-x-6 gap-y-1 px-3 py-2.5 sm:flex-row sm:items-center sm:px-4`}>
      <div className="min-w-0 flex-1 space-y-1">
        {body}
        {(scope || asOfTime) && hasData && (
          <p className="flex flex-wrap gap-x-3 text-meta text-ink-muted">
            {scope && <span>{commonCopy.summary.scope(scope)}</span>}
            {asOfTime && <span>{commonCopy.summary.asOf(asOfTime)}</span>}
          </p>
        )}
        {loadState === 'stale' && hasData && (
          <div role="status" className="flex flex-wrap items-center gap-x-2 text-meta text-ink-muted">
            <span>{commonCopy.summary.refreshFailed} {getApiErrorMessage(error, commonCopy.summary.checkConnection)}</span>
            <Retry onRetry={onRetry} />
          </div>
        )}
      </div>
      {link && (
        <Link to={link.to} className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-body-strong text-brand hover:underline sm:min-h-8 sm:self-auto">
          {link.label ?? commonCopy.summary.fullReport}
        </Link>
      )}
    </section>
  );
}
