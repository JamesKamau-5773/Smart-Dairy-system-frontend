import GroupedList from '../periods/GroupedList';
import { TableHead } from './DataTable';
import { CardSkeletons, ListLoadMessage, SlowLoadingHint, StaleDataNotice, TableSkeletonRows } from '../ui/ListLoadState';

/**
 * The one grouped records table (Production Log, Ledger): a brand-blue header, Year → Month
 * → Day group rows with chevrons, and the page's rows inside each day. From xl up it is a
 * fixed-layout table (columns never move as groups open and close); below xl the same groups
 * hold cards.
 *
 * Presentational. Group totals come from the API (`groups`, looked up by key) and are placed
 * by column id through `config.columnTotals`, so a total sits under the values it sums.
 *
 * columns:     [{ id, header, align?, width?, mono? }]   one source for header, rows and totals
 * rows:        records; `getBucket(row)` gives { year, month, day } keys from the API
 * config:      grouping config (levels, noun, columnTotals, labelMeta, renderSummary, describeSummary)
 * renderRow:   (row) => <tr>  (desktop)        renderCard: (row) => node  (phones and tablets)
 * loadState:   'loading' | 'ready' | 'stale' | 'error' | 'offline'  (lib/listLoadState)
 * focus:       { key, nonce } opens that group and scrolls to it
 * empty:       what to show when the loaded result has no rows
 */
export default function GroupedDataTable({
  columns,
  rows,
  getBucket,
  groups,
  groupsUnavailable = false,
  onRetryGroups,
  config,
  renderRow,
  renderCard,
  focus,
  loadState,
  error,
  onRetry,
  rowsLabel,
  empty,
}) {
  const isLoading = loadState === 'loading';
  const isUnavailable = loadState === 'offline' || loadState === 'error';
  const listProps = { records: rows, getBucket, groups, groupsUnavailable, onRetryGroups, config, focus };
  const hasRows = rows.length > 0;

  if (isUnavailable) return <ListLoadMessage state={loadState} label={rowsLabel} error={error} onRetry={onRetry} />;

  return (
    <>
      {isLoading && <SlowLoadingHint label={rowsLabel} />}
      {loadState === 'stale' && <StaleDataNotice label={rowsLabel} error={error} onRetry={onRetry} />}
      <div className="hidden xl:block">
        <table className="w-full table-fixed border-collapse text-left">
          <TableHead columns={columns} />
          <tbody className="bg-card" aria-busy={isLoading}>
            {isLoading ? <TableSkeletonRows columns={columns.length} />
              : hasRows ? <GroupedList {...listProps} variant="table" columns={columns} renderRecord={renderRow} />
                : <tr><td colSpan={columns.length} className="p-10 text-center text-sm text-ink-muted !font-sans">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="xl:hidden" aria-busy={isLoading}>
        {isLoading ? <div className="divide-y divide-ink/10"><CardSkeletons /></div>
          : hasRows ? <GroupedList {...listProps} variant="cards" renderRecord={renderCard} />
            : <div className="p-6 text-center text-sm text-ink-muted">{empty}</div>}
      </div>
    </>
  );
}
