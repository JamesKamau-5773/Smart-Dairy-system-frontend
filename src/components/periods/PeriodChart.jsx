/**
 * Paired bars per sub-period (e.g. money in / money out per month) on one zero baseline.
 * Heights are a display scale against the tallest bar; no figure shown is derived here.
 * An empty sub-period has no bar and no tooltip. Clicking a bar calls onSelect(key).
 *
 * series: [{ id, label, barClass }] — `id` is the item field holding the value.
 * describe(item) → tooltip text; isEmpty(item) → boolean; axisLabel(item) → string.
 */
export default function PeriodChart({ items, series, describe, isEmpty, axisLabel, onSelect, label = 'Breakdown' }) {
  const bars = (items ?? []).filter((item) => item?.key);
  if (bars.length === 0) return null;
  const magnitude = (value) => (Number.isFinite(value) ? Math.abs(value) : 0);
  const largest = Math.max(0, ...bars.flatMap((item) => series.map((entry) => magnitude(item[entry.id]))));
  const height = (value) => (largest > 0 && magnitude(value) > 0 ? Math.max((magnitude(value) / largest) * 100, 3) : 0);
  // Thin the axis labels when there are many sub-periods (days in a month).
  const labelEvery = bars.length <= 12 ? 1 : Math.ceil(bars.length / 10);

  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        {series.map((entry) => (
          <span key={entry.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[2px] ${entry.barClass}`} />
            {entry.label}
          </span>
        ))}
      </figcaption>
      <div role="list" aria-label={label} className="flex h-28 min-w-0 items-end gap-1 border-b border-ink/30 sm:gap-1.5">
        {bars.map((item) => {
          if (isEmpty(item)) return <div key={item.key} role="listitem" aria-label={`${item.label}: no records`} className="h-full min-w-0 flex-1" />;
          const text = describe(item);
          return (
            <div key={item.key} role="listitem" className="group relative h-full min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect?.(item.key)}
                aria-label={text}
                className="flex h-full w-full items-end justify-center gap-px !rounded-none hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                {series.map((entry) => (
                  <span key={entry.id} aria-hidden="true" className={`block w-full max-w-4 rounded-t-[2px] ${entry.barClass}`} style={{ height: `${height(item[entry.id])}%` }} />
                ))}
              </button>
              <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-badge bg-ink px-2 py-1 text-[11px] font-medium text-white group-hover:block group-focus-within:block">
                {text}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex min-w-0 gap-1 sm:gap-1.5">
        {bars.map((item, index) => (
          <span key={item.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink-muted">
            {index % labelEvery === 0 ? axisLabel(item) : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}
