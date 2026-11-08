import { Link } from 'react-router-dom';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { formatLitres } from '../../lib/numberFormat';

const nameLink = 'text-ink underline-offset-2 hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none';

/**
 * Compact, secondary list of the latest calf feedings for the Production Log.
 * Shows records only; the period's "Fed to calves" total belongs to the API.
 */
export default function RecentCalfFeedings({ records, isLoading, error, viewAllHref }) {
  return (
    <section aria-labelledby="recent-calf-feedings" className="min-w-0 rounded-card border border-ink/10 bg-card">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-ink/10 px-3 sm:px-4">
        <h3 id="recent-calf-feedings" className="text-sm font-semibold text-ink">Recent calf feedings</h3>
        {viewAllHref && <Link to={viewAllHref} className="inline-flex min-h-11 items-center text-xs font-semibold text-brand hover:underline">View all</Link>}
      </header>
      {isLoading ? (
        <p className="px-3 py-3 text-xs text-ink-muted sm:px-4">Loading calf feedings…</p>
      ) : error ? (
        <p role="alert" className="px-3 py-3 text-xs text-ink sm:px-4">Couldn’t load calf feedings.</p>
      ) : records.length === 0 ? (
        <p className="px-3 py-3 text-xs text-ink-muted sm:px-4">No calf feedings recorded.</p>
      ) : (
        <>
          <table className="hidden w-full text-left text-xs xl:table">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr className="border-b border-ink/10">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Calf</th>
                <th className="px-3 py-2 text-right font-semibold">Litres</th>
                <th className="px-4 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {records.map((record) => (
                <tr key={record.id} className="h-10">
                  <td className="px-4 !py-0 text-ink-muted">{formatDate(record.date)}</td>
                  <td className="px-3 !py-0"><Link to={`/operations/animal/${record.calfId}`} className={nameLink}>{formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}</Link></td>
                  <td className="px-3 !py-0 text-right font-mono tabular-nums text-ink">{formatLitres(record.liters)}</td>
                  <td className="max-w-xs truncate px-4 !py-0 font-sans text-ink-muted" title={record.notes || undefined}>{record.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-ink/5 xl:hidden">
            {records.map((record) => (
              <li key={record.id} className="flex min-h-11 min-w-0 items-center justify-between gap-3 px-3 py-2 text-xs sm:px-4">
                <div className="min-w-0">
                  <Link to={`/operations/animal/${record.calfId}`} className={`block truncate font-medium ${nameLink}`}>{formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}</Link>
                  <p className="mt-0.5 truncate text-ink-muted">{formatDate(record.date)}{record.notes ? ` · ${record.notes}` : ''}</p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-ink">{formatLitres(record.liters)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
