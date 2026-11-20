import Skeleton from './Skeleton';
import BrandLogo from '../brand/BrandLogo';

const SUMMARY_CARDS = 3;
const LIST_ROWS = 5;
const FORM_FIELDS = 3;

/**
 * A centred card with a few fields: the shape of the sign-in and verification screens. As the
 * full-page loading screen it carries the mascot above it (static; only the skeleton pulses).
 */
function CardSkeleton({ label }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-warm p-4">
      <span className="sr-only">{label}</span>
      <BrandLogo variant="mascot" size={88} decorative />
      <div className="w-full max-w-md space-y-5 rounded-card border border-ink/10 bg-surface p-6 sm:p-8" aria-hidden="true">
        <Skeleton className="mx-auto h-7 w-40" />
        {Array.from({ length: FORM_FIELDS }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

/**
 * Placeholder shaped like the screen that is loading, while its code or an access check
 * loads. The label is read by screen readers instead of being shown.
 *
 * @param {object} props
 * @param {string} [props.label] What is loading, e.g. "Loading production log…".
 * @param {'page'|'card'} [props.variant] `page` (default): title, summary cards and a list,
 *   for pages inside the app shell. `card`: a full-screen centred form card, for sign-in,
 *   verification and other screens outside the shell.
 *
 * @example
 * <Suspense fallback={<PageSkeleton label="Loading payroll…" />}><Payroll /></Suspense>
 * <Suspense fallback={<PageSkeleton variant="card" label="Loading login…" />}><LoginPage /></Suspense>
 */
export default function PageSkeleton({ label = 'Loading…', variant = 'page' }) {
  if (variant === 'card') return <CardSkeleton label={label} />;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto w-full max-w-6xl space-y-6"
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-7 w-48 max-w-[60%]" />
        <Skeleton className="h-4 w-72 max-w-[80%]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: SUMMARY_CARDS }, (_, index) => (
          <div key={index} className="space-y-3 rounded-card border border-ink/10 bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-ink/10 rounded-card border border-ink/10 bg-surface" aria-hidden="true">
        {Array.from({ length: LIST_ROWS }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 p-4">
            <div className="w-1/2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
