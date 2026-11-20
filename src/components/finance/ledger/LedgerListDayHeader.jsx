import Money from '../../ui/Money';

// Sticky offsets match the page scroller's padding (p-4 sm:p-6 md:p-8), as the table's month row.
const STICKY = 'sticky -top-4 z-[1] sm:-top-6 md:-top-8';

/**
 * A day in the phone list: "18 Nov 2026" and the day's net from the API, on a muted band that
 * stays in view while its records scroll. Not a control: days are always open.
 */
export default function LedgerListDayHeader({ label, totals }) {
  return (
    <h3 className={`${STICKY} m-0 flex min-h-10 items-center justify-between gap-3 border-y border-ink/10 bg-ink-50 px-4 py-2 text-body-strong text-ink-muted`}>
      <span className="min-w-0 truncate tabular-nums">{label}</span>
      <span className="shrink-0 text-meta tabular-nums">
        {totals?.net == null ? '—' : <Money amount={totals.net} cents="plain" className="text-meta" />}
      </span>
    </h3>
  );
}
