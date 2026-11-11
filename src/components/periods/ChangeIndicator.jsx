import { formatPercentMagnitude } from '../../lib/numberFormat';
import { commonCopy } from '../../i18n/common';

// The arrow carries the direction; the colour only repeats it.
const MARKS = {
  up: { glyph: '▲', className: 'text-money-positive' },
  down: { glyph: '▼', className: 'text-money-negative' },
  flat: { glyph: '–', className: 'text-ink-muted' },
};

/** Compact line under a metric: "▲ 4.1% vs prior week". */
export function CompactChange({ change, vsText }) {
  const mark = change ? MARKS[change.direction] : null;
  const percent = change ? formatPercentMagnitude(change.pct) : null;
  if (!mark || !percent) return <span aria-hidden="true">&nbsp;</span>;
  return (
    <span aria-label={`${commonCopy.period.change[change.direction]} ${percent} ${vsText}`}>
      <span aria-hidden="true" className={`font-mono tabular-nums ${mark.className}`}>{mark.glyph} {percent}</span>
      <span aria-hidden="true"> {vsText}</span>
    </span>
  );
}

/**
 * A metric-sized change: "▲ 4.1%". Null when the API sent no usable change, so the
 * caller can say why (no previous data) instead of showing a dash.
 */
export function ChangeValue({ change, vsText }) {
  const mark = change ? MARKS[change.direction] : null;
  const percent = change ? formatPercentMagnitude(change.pct) : null;
  if (!mark || !percent) return null;
  return (
    <span aria-label={`${commonCopy.period.change[change.direction]} ${percent}${vsText ? ` ${vsText}` : ''}`} className={mark.className}>
      <span aria-hidden="true">{mark.glyph} {percent}</span>
    </span>
  );
}
