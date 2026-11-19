import InfoTip from '../ui/InfoTip';
import { SURFACE } from './surface';

// Two looks from the theme: a light card, and a tile on the dark brand band.
const VARIANTS = {
  default: {
    box: `${SURFACE} px-4 py-2.5 sm:py-3`,
    label: 'text-ink-muted',
    value: 'text-ink',
    info: 'text-ink-muted hover:text-ink',
  },
  emphasis: {
    box: 'min-w-0 rounded-input bg-brand-800 px-4 py-2.5 sm:py-3',
    label: 'text-brand-100',
    value: 'text-white',
    info: 'text-brand-100 hover:text-white',
  },
};

/**
 * One figure with its label (and an optional ⓘ). Renders a <div> holding a <dt>/<dd> pair, so
 * place it inside a <dl>.
 *
 * label:   the figure's name
 * value:   the formatted value (a node), already "—" when unknown
 * info:    optional explanation behind an ⓘ
 * variant: 'default' (light) | 'emphasis' (on the dark brand band)
 * layout:  'tile' (small-caps label over the value; label-left on phones) | 'row' (one line of a
 *          list: label left, value right; the list draws the dividers)
 */
export default function KpiCard({ label, value, info, variant = 'default', layout = 'tile' }) {
  const look = VARIANTS[variant] ?? VARIANTS.default;
  const tip = info && <InfoTip topic={label} className={look.info}>{info}</InfoTip>;

  if (layout === 'row') {
    return (
      <div className="flex min-h-12 min-w-0 items-center justify-between gap-3 py-2.5">
        <dt className={`flex min-w-0 items-center gap-1 text-body ${look.label}`}>
          <span className="truncate">{label}</span>
          {tip}
        </dt>
        <dd className={`m-0 shrink-0 whitespace-nowrap text-stat-value tabular-nums ${look.value}`}>{value}</dd>
      </div>
    );
  }

  return (
    // Phones: label left and value right on one line, so six figures stay short; sm+: stacked.
    <div className={`flex min-w-0 items-center justify-between gap-3 sm:block ${look.box}`}>
      <dt className={`flex min-w-0 items-center gap-1 text-label ${look.label}`}>
        <span className="truncate">{label}</span>
        {tip}
      </dt>
      <dd className={`min-w-0 shrink-0 truncate text-stat-value tabular-nums sm:mt-1 ${look.value}`}>{value}</dd>
    </div>
  );
}
