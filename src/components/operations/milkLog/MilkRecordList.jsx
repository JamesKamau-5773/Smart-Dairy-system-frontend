import { CloudOff, RefreshCcw } from 'lucide-react';
import Skeleton from '../../ui/Skeleton';
import { commonCopy } from '../../../i18n/common';
import { getApiErrorMessage } from '../../../lib/backendApi';

// A skeleton shaped like a row: name and time bars left, litres bars right.
function RowSkeleton() {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-ink-100 bg-white py-2.5 pl-4 pr-3" aria-hidden="true">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex flex-col items-end space-y-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

// The list couldn't load (or is offline): the same words and retry as the other lists, in the
// list's neutral palette.
function ListProblem({ state, label, error, onRetry }) {
  const { list } = commonCopy;
  const isOffline = state === 'offline';
  return (
    <div role={isOffline ? 'status' : 'alert'} className="space-y-3 bg-white px-4 py-8 text-center">
      {isOffline && <CloudOff size={20} className="mx-auto text-ink-400" aria-hidden="true" />}
      <p className="text-body-strong text-ink-900">{isOffline ? list.offlineTitle(label) : list.errorTitle(label)}</p>
      <p className="text-body text-ink-500">{isOffline ? list.offlineDetail : getApiErrorMessage(error, list.errorDetail)}</p>
      {!isOffline && onRetry && (
        <button type="button" onClick={() => onRetry()} className="btn-command inline-flex items-center">{list.tryAgain}</button>
      )}
    </div>
  );
}

/**
 * The phone records list: one block per farm day and session under a sticky header, newest
 * first, with loading, empty and error states. Presentational: groups arrive ready to show.
 *
 * groups:  [{ key, label, isToday, rows: [{ key, ...MilkRecordRow props }] }]
 * renderRow: (row) => node
 * loadState: 'loading' | 'ready' | 'stale' | 'error' | 'offline'
 * empty:   what to show when the loaded result has no records
 */
export default function MilkRecordList({ groups, renderRow, loadState, error, onRetry, rowsLabel, todayLabel, empty }) {
  if (loadState === 'error' || loadState === 'offline') {
    return <ListProblem state={loadState} label={rowsLabel} error={error} onRetry={onRetry} />;
  }
  if (loadState === 'loading') {
    return <div aria-busy="true">{Array.from({ length: 6 }, (_, index) => <RowSkeleton key={index} />)}</div>;
  }

  return (
    <div>
      {loadState === 'stale' && (
        <div role="status" className="flex items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 py-2.5 text-meta text-ink-600">
          <span>{commonCopy.list.stale(rowsLabel)} {getApiErrorMessage(error, commonCopy.list.staleDetail)}</span>
          <button type="button" onClick={() => onRetry()} className="inline-flex shrink-0 items-center gap-1 text-control text-brand">
            <RefreshCcw size={14} aria-hidden="true" /> {commonCopy.list.tryAgain}
          </button>
        </div>
      )}
      {groups.length === 0 ? (
        <div className="bg-white px-4 py-8 text-center text-body text-ink-500">{empty}</div>
      ) : groups.map((group) => (
        <section key={group.key} aria-labelledby={`milk-group-${group.key}`}>
          <h2
            id={`milk-group-${group.key}`}
            className="sticky top-0 z-[1] m-0 flex min-h-9 items-center gap-2 border-b border-ink-200 bg-ink-100 px-4 py-2 text-stat-label text-ink-600"
          >
            {group.label}
            {group.isToday && (
              <span className="rounded-sm border border-brand px-1.5 text-badge text-brand">{todayLabel}</span>
            )}
          </h2>
          {group.rows.map((row) => renderRow(row))}
        </section>
      ))}
    </div>
  );
}
