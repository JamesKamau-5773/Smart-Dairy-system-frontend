import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { productionCopy } from '../../i18n/production';

const calfLink = 'font-semibold text-brand underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none';

/**
 * The latest calf feedings for the Production Log, with the backend's totals for all of them
 * ("53 feedings · 310.00 L allocated"). Shows records only; totals are never added up here.
 *
 * records: normalized milk dispositions (the latest few)
 * count, totalLitres: the backend's totals, or null when not sent
 */
export default function RecentCalfFeedings({ records, count = null, totalLitres = null, isLoading, error, viewAllHref }) {
  const copy = productionCopy.calves;
  const totalsLine = copy.totals(count, formatCount(count), formatLitres(totalLitres));

  return (
    <section aria-labelledby="recent-calf-feedings" className="overflow-hidden rounded-xl border border-ink/10 bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-full bg-brand-100 p-2 text-brand">
            <Activity size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="recent-calf-feedings" className="m-0 text-sm font-bold text-ink-900">{copy.title}</h3>
            {!isLoading && !error && <p className="m-0 text-xs text-ink-500">{totalsLine}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="shrink-0 rounded border border-ink-200 bg-card px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50">
            {copy.viewAll}
          </Link>
        )}
      </header>

      {isLoading ? (
        <p className="px-5 py-3 text-xs text-ink-muted">{copy.loading}</p>
      ) : error ? (
        <p role="alert" className="px-5 py-3 text-xs text-ink">{copy.failed}</p>
      ) : records.length === 0 ? (
        <p className="px-5 py-3 text-xs text-ink-muted">{copy.empty}</p>
      ) : (
        <>
        {/* From md up a table (scrolling sideways if it must); phones get a list instead. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="whitespace-nowrap border-b border-ink-100 bg-card text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-bold">{copy.date}</th>
                <th scope="col" className="px-5 py-2.5 font-bold">{copy.calf}</th>
                <th scope="col" className="px-5 py-2.5 text-right font-bold">{copy.litres}</th>
                <th scope="col" className="px-5 py-2.5 font-bold">{copy.notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50 text-sm">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-ink-50/50">
                  <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-ink-600">{formatDate(record.date)}</td>
                  <td className="whitespace-nowrap px-5 py-2 !font-sans">
                    <Link to={`/operations/animal/${record.calfId}`} className={calfLink}>{formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}</Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2 text-right font-mono font-bold tabular-nums text-ink-900">
                    {formatLitres(record.liters, { unit: false })}
                    {record.liters != null && <span className="font-normal text-ink-500"> L</span>}
                  </td>
                  <td className="max-w-xs truncate px-5 py-2 !font-sans text-ink-400" title={record.notes || undefined}>{record.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="m-0 list-none divide-y divide-ink-50 p-0 md:hidden">
          {records.map((record) => (
            <li key={record.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <Link to={`/operations/animal/${record.calfId}`} className={`block truncate ${calfLink}`}>{formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag })}</Link>
                <p className="m-0 mt-0.5 truncate text-xs text-ink-500">
                  <span className="font-mono">{formatDate(record.date)}</span>{record.notes ? ` · ${record.notes}` : ''}
                </p>
              </div>
              <span className="shrink-0 font-mono font-bold tabular-nums text-ink-900">
                {formatLitres(record.liters, { unit: false })}
                {record.liters != null && <span className="font-normal text-ink-500"> L</span>}
              </span>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}
