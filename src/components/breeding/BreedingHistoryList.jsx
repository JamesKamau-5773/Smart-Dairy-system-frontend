import { TableHead, cellClass } from '../data/DataTable';
import { SURFACE } from '../data/surface';
import { LEVEL_STYLES } from '../periods/groupLevels';
import { formatDate } from '../../lib/dateFormat';
import { formatBreedingCowLabel } from '../../lib/breedingUtils';
import { historyMonthLabel } from '../../lib/breedingHistory';
import { breedingCopy } from '../../i18n/breeding';
import { BreedingStatusBadge, SemenSourceBadge } from './BreedingBadges';

/**
 * Historical Checks, grouped by AI service month. Phones and tablets get cards under a sticky
 * month header; desktop gets one table (the shared brand header) with a month row above each
 * month, like the Production Log and Ledger.
 *
 * Not GroupedDataTable: that reads group counts and totals from a group-totals endpoint, and
 * breeding history has none. The count on a month is the number of rows listed under it.
 *
 * groups: Map of month key → normalized breeding logs (lib/breedingHistory groupHistoryByMonth).
 */

// A column, its header read when shown (so it follows the language) and, for plain fields,
// how to show the value. One definition each, shared by the card and the table row.
const column = (id, value) => ({ id, get header() { return breedingCopy.hub.columns[id]; }, value });
const FIELDS = [
  column('aiDate', (entry) => formatDate(entry.aiDate, '—')),
  column('bull', (entry) => entry.sireCode || '—'),
  column('expectedCalving', (entry) => formatDate(entry.expectedCalvingDate, '—')),
  // TODO(BR-025): "—" until the backend sends `updated_at`.
  column('updated', (entry) => formatDate(entry.updatedAt, '—')),
];
const field = (id) => FIELDS.find((candidate) => candidate.id === id);

const COLUMNS = [
  column('cow'),
  field('aiDate'),
  field('bull'),
  field('expectedCalving'),
  column('source'),
  column('status'),
  field('updated'),
];

function MonthCount({ count }) {
  return (
    <span className="rounded-full border border-brand/15 bg-card px-2.5 py-0.5 text-badge text-brand">
      {breedingCopy.hub.recordCount(count)}
    </span>
  );
}

function CowCell({ entry }) {
  return (
    <div className="min-w-0">
      <div className="break-words text-body-strong text-ink-strong">{formatBreedingCowLabel(entry)}</div>
      {entry.notes && <div className="mt-1 break-words text-meta text-ink-muted">{entry.notes}</div>}
    </div>
  );
}

function HistoryCard({ entry }) {
  return (
    <li className={`${SURFACE} p-3`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <CowCell entry={entry} />
        <BreedingStatusBadge status={entry.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink/10 pt-2 text-meta">
        {FIELDS.map(({ id, header, value }) => (
          <div key={id} className="min-w-0">
            <dt className="text-ink-muted">{header}</dt>
            <dd className="break-words text-ink">{value(entry)}</dd>
          </div>
        ))}
        <div className="col-span-2 min-w-0">
          <dt className="sr-only">{breedingCopy.hub.columns.source}</dt>
          <dd><SemenSourceBadge source={entry.semenSource} /></dd>
        </div>
      </dl>
    </li>
  );
}

function HistoryRow({ entry }) {
  const cells = {
    cow: <CowCell entry={entry} />,
    source: <SemenSourceBadge source={entry.semenSource} />,
    status: <BreedingStatusBadge status={entry.status} />,
  };
  return (
    <tr className="border-b border-ink/10 align-top text-body transition-colors last:border-b-0 hover:bg-ink-50">
      {COLUMNS.map((column) => (
        <td key={column.id} className={cellClass(column, `py-3 ${column.value ? 'whitespace-nowrap text-ink-600' : ''}`)}>
          {column.value ? column.value(entry) : cells[column.id]}
        </td>
      ))}
    </tr>
  );
}

export default function BreedingHistoryList({ groups }) {
  if (groups.size === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink/15 bg-card p-6 text-center text-body text-ink-muted">
        {breedingCopy.hub.noHistoryMatches}
      </div>
    );
  }

  const months = Array.from(groups.entries());

  return (
    <>
      <div className="space-y-4 lg:hidden">
        {months.map(([monthKey, entries]) => (
          <section key={monthKey} aria-label={historyMonthLabel(monthKey)}>
            {/* Offsets match the modal body's padding (p-4 sm:p-6), so the header meets its top. */}
            <div className={`${LEVEL_STYLES.month} sticky -top-4 z-10 flex items-center justify-between rounded-md border border-brand/10 px-3 py-2 sm:-top-6`}>
              <h5 className="m-0 text-body-strong">{historyMonthLabel(monthKey)}</h5>
              <MonthCount count={entries.length} />
            </div>
            <ul className="mt-2 space-y-2">
              {entries.map((entry) => <HistoryCard key={entry.id} entry={entry} />)}
            </ul>
          </section>
        ))}
      </div>

      {/* Scrolls sideways rather than squeezing columns when the dialog is narrow. */}
      <div className={`${SURFACE} hidden overflow-x-auto lg:block`}>
        <table className="w-full border-collapse text-left">
          <TableHead columns={COLUMNS} />
          {months.map(([monthKey, entries]) => (
            <tbody key={monthKey} className="bg-card">
              <tr className={LEVEL_STYLES.month}>
                <th scope="colgroup" colSpan={COLUMNS.length} className="border-b border-ink/10 px-3 py-2 text-left sm:px-4">
                  <span className="flex items-center justify-between gap-3">
                    <span>{historyMonthLabel(monthKey)}</span>
                    <MonthCount count={entries.length} />
                  </span>
                </th>
              </tr>
              {entries.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}
