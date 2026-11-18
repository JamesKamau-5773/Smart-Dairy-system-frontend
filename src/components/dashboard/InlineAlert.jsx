import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * A slim one-line notice with one action on the right and a dismiss button. Presentational
 * only: the caller decides when it shows and remembers the dismissal.
 */
export default function InlineAlert({ message, actionLabel, actionTo, onDismiss, dismissLabel, className = '' }) {
  return (
    <div
      role="status"
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-button border border-brand/20 bg-brand-50 py-2 pl-3 pr-2', className)}
    >
      {/* The message keeps its one line; on a narrow phone the actions wrap below it, right-aligned. */}
      <p className="flex min-w-[13rem] flex-1 items-center gap-2.5 text-body text-ink">
        <Info size={16} className="shrink-0 text-brand" aria-hidden="true" />
        {message}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Link to={actionTo} className="btn-command h-9 min-h-0 px-3 py-0">{actionLabel}</Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="inline-flex h-9 w-9 items-center justify-center text-ink-muted hover:bg-brand-100 hover:text-brand"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
