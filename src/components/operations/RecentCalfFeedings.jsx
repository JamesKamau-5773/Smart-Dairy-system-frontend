import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { formatDate } from '../../lib/herdUtils';
import { formatCount, formatLitres } from '../../lib/numberFormat';
import { productionCopy } from '../../i18n/production';

const calfLink = 'text-body-strong text-brand underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none';

function Litres({ value }) {
  return (
    <span className="whitespace-nowrap text-body-strong tabular-nums text-ink-900">
      {formatLitres(value, { unit: false })}
      {value != null && <span className="text-body text-ink-500"> L</span>}
    </span>
  );
}

/**
 * The latest calf feedings for the Production Log, with the backend's totals for all of them
 * ("53 feedings · 310.0 L allocated"). Shows records only; totals are never added up here.
 * From md up a table (scrolling sideways if it must); phones get a list instead.
 *
 * records: normalized milk dispositions (the latest few)
 * count, totalLitres: the backend's totals, or null when not sent
 */
export default function RecentCalfFeedings({ records, count = null, totalLitres = null, isLoading, error, viewAllHref }) {
  const copy = productionCopy.calves;
  const totalsLine = copy.totals(count, formatCount(count), formatLitres(totalLitres));
  const calfName = (record) => formatCowIdentity({ cowName: record.calfName, cowTag: record.calfTag });

  return (
    <section aria-labelledby="recent-calf-feedings" className="overflow-hidden rounded-xl border border-ink/10 bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-full bg-brand-100 p-2 text-brand">
            <Activity size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="recent-calf-feedings" className="m-0 text-section-title text-ink-900">{copy.title}</h2>
            {!isLoading && !error && <p className="m-0 text-meta text-ink-500">{totalsLine}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="shrink-0 rounded border border-ink-200 bg-card px-3 py-1.5 text-control text-ink-600 transition-colors hover:bg-ink-50">
            {copy.viewAll}
          </Link>
        )}
      </header>

      {isLoading ? (
        <p className="px-5 py-3 text-body text-ink-muted">{copy.loading}</p>
      ) : error ? (
        <p role="alert" className="px-5 py-3 text-body text-ink">{copy.failed}</p>
      ) : records.length === 0 ? (
        <p className="px-5 py-3 text-body text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="whitespace-nowrap border-b border-ink-100 bg-card text-label text-ink-500">
                <tr>
                  <th scope="col" className="px-5 py-2.5">{copy.date}</th>
                  <th scope="col" className="px-5 py-2.5">{copy.calf}</th>
                  <th scope="col" className="px-5 py-2.5 text-right">{copy.litres}</th>
                  <th scope="col" className="px-5 py-2.5">{copy.notes}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-body">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-ink-50/50">
                    <td className="whitespace-nowrap px-5 py-2 text-meta tabular-nums text-ink-600">{formatDate(record.date)}</td>
                    <td className="whitespace-nowrap px-5 py-2">
                      <Link to={`/operations/animal/${record.calfId}`} className={calfLink}>{calfName(record)}</Link>
                    </td>
                    <td className="px-5 py-2 text-right"><Litres value={record.liters} /></td>
                    <td className="max-w-xs truncate px-5 py-2 text-ink-400" title={record.notes || undefined}>{record.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="m-0 list-none divide-y divide-ink-50 p-0 md:hidden">
            {records.map((record) => (
              <li key={record.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link to={`/operations/animal/${record.calfId}`} className={`block truncate ${calfLink}`}>{calfName(record)}</Link>
                  <p className="m-0 mt-0.5 truncate text-meta text-ink-500">
                    <span className="tabular-nums">{formatDate(record.date)}</span>{record.notes ? ` · ${record.notes}` : ''}
                  </p>
                </div>
                <Litres value={record.liters} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
