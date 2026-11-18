import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

// The figure's type role per variant. Every variant shares the card's structure, padding,
// border and label; only the figure's size (and the primary card's highlight) differ.
const VALUE_ROLE = {
  default: 'text-stat-value',
  primary: 'text-money-value-primary',
  secondary: 'text-money-value-secondary',
};

const TONE = {
  default: 'text-brand',
  danger: 'text-money-negative',
};

// A skeleton bar inside a line box of the given role, so a loading card has exactly the height
// of a loaded one.
const SkeletonLine = ({ role, width }) => (
  <div className={role} aria-hidden="true">
    <Skeleton className={cn('inline-block h-[0.8em] align-middle', width)} />
  </div>
);

/**
 * One dashboard figure: its name (with the short accent line under it), then the value and unit.
 * Presentational only: it shows the text it is given and works nothing out.
 *
 * - `value`: the formatted figure, or null when the backend sent none: a muted "—" in the same
 *   type role, so the card keeps its shape.
 * - `variant`: "default" (milk figures), "primary" (the one figure the page leads with: larger,
 *   highlighted) or "secondary" (money figures beside it).
 * - `tone`: "danger" for a negative figure.
 * - `tooltip`: extra detail behind an info button; `tooltipLabel` names that button.
 * - `loading`: skeletons shaped like the label and the value.
 */
export default function StatCard({
  label,
  value,
  unit,
  tooltip,
  tooltipLabel,
  variant = 'default',
  tone = 'default',
  loading = false,
  className = '',
}) {
  const primary = variant === 'primary';
  const valueRole = VALUE_ROLE[variant] ?? VALUE_ROLE.default;
  const missing = value === null || value === undefined;
  return (
    <div
      // The highlight is repeated for :hover, where the shared card style would otherwise
      // replace it with the plain card background.
      className={cn('glass-panel flex min-w-0 flex-col gap-4 p-5', primary && 'bg-brand/5 hover:bg-brand/5', className)}
      data-variant={variant}
      aria-busy={loading || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {loading ? (
            <>
              <span className="sr-only">{label}</span>
              <SkeletonLine role="text-stat-label" width={primary ? 'w-28' : 'w-24'} />
            </>
          ) : (
            <p className={cn('text-stat-label', primary ? 'text-brand' : 'text-ink-muted')}>{label}</p>
          )}
          <div className="h-1 w-8 rounded-full bg-brand" aria-hidden="true" />
        </div>
        {tooltip && !loading && (
          <Popover>
            <PopoverTrigger
              type="button"
              aria-label={tooltipLabel}
              className="-mr-2 -mt-2 inline-flex h-8 w-8 shrink-0 items-center justify-center text-ink-500 hover:bg-brand-50 hover:text-brand"
            >
              <Info size={16} aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent align="end" className="text-body text-ink">{tooltip}</PopoverContent>
          </Popover>
        )}
      </div>

      <div className="mt-auto min-w-0">
        {loading ? (
          <SkeletonLine role={valueRole} width={primary ? 'w-40' : 'w-24'} />
        ) : (
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 break-words">
            {missing ? (
              <span className={cn(valueRole, 'text-ink-muted')}>—</span>
            ) : (
              <>
                <span className={cn(valueRole, TONE[tone] ?? TONE.default)}>{value}</span>
                {unit && <span className="text-stat-unit text-ink-muted">{unit}</span>}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
