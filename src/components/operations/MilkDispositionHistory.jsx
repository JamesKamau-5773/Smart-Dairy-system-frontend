import { Link } from 'react-router-dom';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { milkCopy } from '../../i18n/milk';

export default function MilkDispositionHistory({
  records,
  isLoading,
  error,
  onRecord,
  title = milkCopy.calfHistory.title,
  totalCount = records.length,
  totalLiters = records.reduce((total, record) => total + record.liters, 0),
  viewAllHref,
  footer,
}) {
  const copy = milkCopy.calfHistory;

  return (
    <section className="card-machined overflow-hidden !p-0" aria-labelledby="calf-milk-heading">
      <header className="flex flex-col gap-4 border-b border-ink/10 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>
            <h2 id="calf-milk-heading" className="text-section-title text-ink">{title}</h2>
            <p className="mt-0.5 text-meta text-ink-muted">
              {copy.summary(totalCount, Number(totalLiters).toFixed(2))}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {viewAllHref && (
            <Link to={viewAllHref} className="btn-ghost justify-center px-4 py-2 text-control">{copy.viewAll}</Link>
          )}
          {onRecord && (
            <button type="button" onClick={onRecord} className="btn-secondary justify-center px-4 py-2 text-control">

              {copy.feedCalf}
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="px-5 py-8 text-center text-body text-ink-muted">{copy.loading}</div>
      ) : error ? (
        <div role="alert" className="border-l-4 border-brand bg-brand-50 px-5 py-4 text-body-strong text-brand-dark">
          {copy.failed}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <p className="text-body-strong text-ink">{copy.emptyTitle}</p>
          <p className="mt-1 text-meta text-ink-muted">{copy.emptyHint}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-surface-raised text-label text-ink-muted">
                <tr>
                  <th className="px-5 py-3">{copy.columns.date}</th>
                  <th className="px-5 py-3">{copy.columns.calf}</th>
                  <th className="px-5 py-3 text-right">{copy.columns.consumed}</th>
                  <th className="px-5 py-3">{copy.columns.notes}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 bg-surface">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-raised">
                    <td className="px-5 py-4 text-body text-ink-muted">{formatDate(record.date)}</td>
                    <td className="px-5 py-4">
                      <Link to={`/operations/animal/${record.calfId}`} className="text-body-strong text-brand hover:underline">
                        {formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right text-body-strong tabular-nums text-ink">{record.liters.toFixed(2)} L</td>
                    <td className="max-w-xs truncate px-5 py-4 text-body text-ink-muted" title={record.notes || undefined}>{record.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-ink/10 bg-surface md:hidden">
            {records.map((record) => (
              <article key={record.id} className="min-w-0 space-y-2 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <Link to={`/operations/animal/${record.calfId}`} className="min-w-0 break-words text-body-strong text-brand hover:underline">
                    {formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}
                  </Link>
                  <span className="shrink-0 text-right text-body-strong tabular-nums text-ink">{record.liters.toFixed(2)} L</span>
                </div>
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 text-meta text-ink-muted">
                  <time>{formatDate(record.date)}</time>
                  <span className="break-words text-right">{record.notes || copy.noNotes}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {footer && <footer className="border-t border-ink/10 bg-surface px-5 py-4">{footer}</footer>}
    </section>
  );
}
