import { useEffect, useState } from 'react';
import { AlertTriangle, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import Skeleton from './Skeleton';
import { getApiErrorMessage } from '../../lib/backendApi';

export function TableSkeletonRows({ columns, rows = 5 }) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <tr key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={columnIndex} className="p-4">
          <Skeleton className={columnIndex === 0 ? 'h-4 w-20' : 'h-4 w-full max-w-[8rem]'} />
        </td>
      ))}
    </tr>
  ));
}

export function CardSkeletons({ rows = 4 }) {
  return Array.from({ length: rows }).map((_, index) => (
    <div key={index} className="space-y-3 p-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="w-1/2 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  ));
}

/** Full-area message for a list that has nothing to show because loading failed or is offline. */
export function ListLoadMessage({ state, label, error, onRetry }) {
  const isOffline = state === 'offline';
  const Icon = isOffline ? CloudOff : AlertTriangle;
  const title = isOffline
    ? `You’re offline, and ${label} haven’t been saved on this phone yet.`
    : `Couldn’t load ${label}.`;
  const detail = isOffline
    ? 'They will load automatically when your connection returns.'
    : getApiErrorMessage(error, 'Check your connection and try again.');

  return (
    <div role={isOffline ? 'status' : 'alert'} className="mx-auto max-w-md space-y-3 p-8 text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${isOffline ? 'bg-brand-50 text-brand' : 'bg-danger-50 text-danger-900'}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm leading-6 text-ink-muted">{detail}</p>
      {!isOffline && onRetry && (
        <button type="button" onClick={() => onRetry()} className="btn-command inline-flex items-center gap-2">
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

/** Slim notice shown above cached rows when a refresh failed. */
export function StaleDataNotice({ label, error, onRetry }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-warning-500/30 bg-warning-50 px-4 py-3 text-sm text-ink">
      <span className="flex min-w-0 items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-700" aria-hidden="true" />
        <span>
          Showing {label} saved on this phone. Couldn’t refresh: {getApiErrorMessage(error, 'check your connection.')}
        </span>
      </span>
      <button type="button" onClick={() => onRetry()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>
  );
}

/**
 * A summary number that depends on a list. Shows a skeleton while the list loads and a dash
 * when it couldn't load, so an unavailable count never reads as a real zero.
 */
export function StatValue({ state, label, className, children }) {
  if (state === 'loading') return <Skeleton className="mt-3 h-7 w-20" />;
  if (state === 'offline' || state === 'error') {
    return (
      <p className="mt-2 text-3xl font-black text-ink-muted" title={`Not available until ${label} load`}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not available until {label} load</span>
      </p>
    );
  }
  return <p className={className}>{children}</p>;
}

/** Appears only when loading drags on, so a slow connection isn't mistaken for a frozen app. */
export function SlowLoadingHint({ label, after = 4000 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), after);
    return () => clearTimeout(timer);
  }, [after]);
  if (!visible) return null;
  return (
    <p role="status" className="flex items-center gap-2 border-b border-ink/10 bg-brand-50 px-4 py-2.5 text-sm text-brand-900">
      <Loader2 size={14} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Still loading {label} – your connection seems slow. They’ll appear as soon as they arrive.
    </p>
  );
}
