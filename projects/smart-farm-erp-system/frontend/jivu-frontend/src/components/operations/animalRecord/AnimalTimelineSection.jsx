import { Calendar, FileText, Filter, HeartPulse, Plus, Syringe } from 'lucide-react';
import { Skeleton } from '../../ui';

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
  const theme = getTimelineTheme(event.type);
  const Icon = event.type === 'Health' ? HeartPulse : event.type === 'Breeding' ? Syringe : FileText;

  return (
    <div className="group relative flex items-start">
      <div className={`absolute left-[-22px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface transition-transform group-hover:scale-110 md:left-[-34px] ${theme.badgeClass}`}>
        <Icon size={16} />
      </div>

      <div className="ml-6 w-full md:ml-4">
        <div className={`rounded-xl border bg-surface p-4 transition-colors hover:bg-surface-raised ${theme.cardClass}`}>
          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h4 className="text-sm font-bold text-ink md:text-base">{event.title}</h4>
            <span className="rounded bg-surface-warm px-2 py-0.5 font-mono text-xs text-ink-muted">{event.date}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">{event.description}</p>
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
  return (
    <div className="card-machined bg-surface-warm/30 p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised p-1">
          <Filter size={14} className="ml-2 mr-1 text-ink-muted" />
          {['All', 'Health', 'Breeding', 'General'].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onFilterChange(category)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeFilter === category ? 'bg-brand text-surface shadow-sm' : 'text-ink-muted hover:bg-ink/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenEventModal}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm transition-colors hover:bg-brand/5"
        >
          <Plus size={14} /> Log Action
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
          Showing page {timelineMeta.page} of {timelineMeta.pages || 1} · {timelineMeta.total ?? events.length} total events
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            disabled={timelinePage <= 1 || isPaginating}
            onClick={onPreviousPage}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            disabled={timelinePage >= (timelineMeta.pages || 1) || isPaginating}
            onClick={onNextPage}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}