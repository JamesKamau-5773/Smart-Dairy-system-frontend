import { cn } from '../../../lib/utils';
import { productionCopy } from '../../../i18n/production';

const ARROW = { down: '▼', up: '▲' };

/**
 * The backend's change against the cow's average: "▼ 0.9 L", "▲ 0.3 L", "at avg", or "—" when
 * not sent. No colour: the arrow (and its spoken word) carries the direction. A drop the
 * backend counts as significant adds the word "drop" in ink.
 *
 * vsAvg: { direction: 'down'|'up'|'level', litres: '0.9 L' } | null  (lib/milkRecords vsAverage)
 */
export default function VsAverageText({ vsAvg, significantDrop = false, className = '', tone = 'text-ink-500' }) {
  const copy = productionCopy.phone;
  if (!vsAvg) return <span className={cn(className, 'text-ink-400')}>—</span>;
  if (vsAvg.direction === 'level') return <span className={cn(className, 'text-ink-400')}>{copy.atAvg}</span>;
  return (
    <span className={cn(className, tone, 'tabular-nums')}>
      <span aria-hidden="true">{ARROW[vsAvg.direction]} </span>
      <span className="sr-only">{vsAvg.direction === 'down' ? copy.lower : copy.higher} </span>
      {vsAvg.litres}
      {significantDrop && vsAvg.direction === 'down' && <span className="text-ink-900"> · {copy.drop}</span>}
    </span>
  );
}
