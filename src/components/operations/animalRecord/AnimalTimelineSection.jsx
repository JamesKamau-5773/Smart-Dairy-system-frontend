import { Skeleton } from '../../ui';
import { herdCopy } from '../../../i18n/herd';
import { formatDateTime } from '../../../lib/audit';

function getTimelineTheme(type) {
  if (type === 'Health') {
    return {
      badgeClass: 'text-danger bg-danger/10 border-danger/20',
      cardClass: 'border-l-danger bg-danger/5 border-danger/15',
    };
  }

  if (type === 'Breeding') {
    return {
      badgeClass: 'text-brand bg-brand/10 border-brand/20',
      cardClass: 'border-l-brand bg-brand/5 border-brand/15',
    };
  }

  return {
    badgeClass: 'text-accent-dark bg-accent/10 border-accent/20',
    cardClass: 'border-l-accent bg-accent/5 border-accent/15',
  };
}

function TimelineEventCard({ event }) {
  const copy = herdCopy.record;
  const theme = getTimelineTheme(event.type);

  return (
    <div className="group relative flex items-start">
      {/* A plain marker on the line; the event type is written out beside the date. */}
      <div className={`absolute left-[-14px] top-2 z-10 h-4 w-4 rounded-full border-2 bg-surface md:left-[-26px] ${theme.badgeClass}`} aria-hidden="true" />

      <div className="ml-6 w-full md:ml-4">
        <div className={`rounded-xl border bg-surface p-4 transition-colors hover:bg-surface-raised ${theme.cardClass}`}>
          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h4 className="text-sm font-bold text-ink md:text-base">{event.title ?? copy.eventFallbackTitle(copy.eventTypes[event.type] ?? event.type)}</h4>
            <span className="flex items-center gap-2">
              {event.type && <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badgeClass}`}>{event.type}</span>}
              <span className="rounded bg-surface-warm px-2 py-0.5 font-mono text-xs text-ink-muted">{event.rawDate ? formatDateTime(event.rawDate) : event.date}</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">{event.description ?? copy.eventFallbackDescription}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnimalTimelineSection({
  events,
  filteredEvents,
  isLoading,
  activeFilter,
  onFilterChange,
  onOpenEventModal,
  timelineMeta,
  timelinePage,
  onPreviousPage,
  onNextPage,
  isPaginating,
}) {
  const copy = herdCopy.record;
  return (
    <div className="card-machined bg-surface-warm/30 p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised p-1">
          {['All', 'Health', 'Breeding', 'General'].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onFilterChange(category)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeFilter === category ? 'bg-brand text-surface' : 'text-ink-muted hover:bg-ink/5'
              }`}
            >
              {copy.eventTypes[category]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenEventModal}
          className="inline-flex items-center rounded-md border border-brand/20 bg-white px-3 py-1.5 text-xs font-bold text-brand  transition-colors hover:bg-brand/5"
        >

  {copy.logAction}
        </button>
      </div>

      <div className="relative space-y-8 pl-4 before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gradient-to-b before:from-brand/25 before:via-brand/20 before:to-transparent md:pl-8 md:before:left-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="group relative flex items-start">
              <div className="absolute left-[-22px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface transition-transform md:left-[-34px]">
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="ml-6 w-full md:ml-4">
                <div className="rounded-xl border border-ink/10 bg-surface p-4 transition-colors hover:bg-surface-raised">
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredEvents.map((event) => <TimelineEventCard key={event.id} event={event} />)
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-xs font-semibold text-ink-muted">
        <span>
          {copy.timelinePage(timelineMeta.page, timelineMeta.pages || 1, timelineMeta.total ?? events.length)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            disabled={timelinePage <= 1 || isPaginating}
            onClick={onPreviousPage}
          >
            {copy.previous}
          </button>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            disabled={timelinePage >= (timelineMeta.pages || 1) || isPaginating}
            onClick={onNextPage}
          >
            {copy.next}
          </button>
        </div>
      </div>
    </div>
  );
}