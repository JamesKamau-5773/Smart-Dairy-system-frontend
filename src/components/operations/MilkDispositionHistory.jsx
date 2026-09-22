import { Baby, Droplets, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';

export default function MilkDispositionHistory({
  records,
  isLoading,
  error,
  onRecord,
  title = 'Calf milk allocations',
  totalCount = records.length,
  totalLiters = records.reduce((total, record) => total + record.liters, 0),
  viewAllHref,
  footer,
}) {

  return (
    <section className="card-machined overflow-hidden !p-0" aria-labelledby="calf-milk-heading">
      <header className="flex flex-col gap-4 border-b border-ink/10 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-brand">
            <Baby size={19} />
          </div>
          <div>
            <h3 id="calf-milk-heading" className="font-semibold text-ink">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              {totalCount} {totalCount === 1 ? 'feeding' : 'feedings'} · {Number(totalLiters).toFixed(2)} L allocated
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {viewAllHref && (
            <Link to={viewAllHref} className="btn-ghost justify-center px-4 py-2 text-xs">View all</Link>
          )}
          {onRecord && (
            <button type="button" onClick={onRecord} className="btn-secondary justify-center gap-2 px-4 py-2 text-xs">
              <Plus size={14} /> Feed calf
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="px-5 py-8 text-center text-sm text-ink-muted">Loading calf feedings...</div>
      ) : error ? (
        <div role="alert" className="border-l-4 border-danger bg-danger/5 px-5 py-4 text-sm font-semibold text-danger">
          Unable to load calf milk allocations.
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <Droplets size={24} className="text-ink/25" />
          <p className="mt-3 text-sm font-semibold text-ink">No calf feedings recorded</p>
          <p className="mt-1 text-xs text-ink-muted">Milk allocated to calves will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-surface-raised text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Calf</th>
                <th className="px-5 py-3 text-right">Milk consumed</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-surface">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-surface-raised">
                  <td className="px-5 py-4 text-sm font-medium text-ink-muted">{formatDate(record.date)}</td>
                  <td className="px-5 py-4">
                    <Link to={`/operations/animal/${record.calfId}`} className="font-semibold text-brand hover:underline">
                      {formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-ink">{record.liters.toFixed(2)} L</td>
                  <td className="max-w-xs truncate px-5 py-4 text-sm text-ink-muted" title={record.notes || undefined}>{record.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer && <footer className="border-t border-ink/10 bg-surface px-5 py-4">{footer}</footer>}
    </section>
  );
}