import { useEntitlements } from '../../hooks/useEntitlements';
import { isFeatureEnabled } from '../../lib/featureFlags';
import { SITE } from '../../landing/content';
import { shellCopy } from '../../i18n/shell';

const { plan: copy } = shellCopy;

/**
 * Shows its children unless the backend says the farm's plan doesn't include `feature`; then it
 * shows what's locked and how to upgrade. While the plan is unknown (or the planIndicators flag
 * is off) the children show as normal: the backend still refuses anything not in the plan.
 *
 * @param {object} props
 * @param {string} props.feature The backend's feature key, e.g. 'payroll' (BR-014).
 * @param {string} props.title What the feature is called, e.g. "Payroll".
 * @param {React.ReactNode} props.children
 *
 * @example
 * <LockedFeature feature="payroll" title="Payroll"><Payroll /></LockedFeature>
 */
export default function LockedFeature({ feature, title, children }) {
  const { access, plan, upgradeUrl } = useEntitlements();
  if (!isFeatureEnabled('planIndicators') || access(feature) !== 'locked') return children;

  return (
    <section aria-labelledby={`locked-${feature}`} className="mx-auto max-w-md rounded-card border border-ink/10 bg-surface p-6 text-center sm:p-8">
      <h2 id={`locked-${feature}`} className="text-lg font-bold text-ink">{copy.lockedTitle(title)}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {plan?.name ? copy.lockedNamedPlan(plan.name, title) : copy.lockedPlan(title)}{' '}
        {copy.lockedUpgrade}
      </p>
      {upgradeUrl ? (
        <a href={upgradeUrl} target="_blank" rel="noopener noreferrer" className="btn-command mt-6 inline-flex justify-center">
          {copy.seePlans}
        </a>
      ) : (
        <p className="mt-6 text-sm font-semibold text-ink">
          {copy.callToUpgrade} <a href={`tel:${String(SITE.phone).replace(/\s/g, '')}`} className="text-brand underline">{SITE.phoneDisplay}</a>.
        </p>
      )}
    </section>
  );
}
