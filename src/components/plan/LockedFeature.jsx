import { Lock } from 'lucide-react';
import { useEntitlements } from '../../hooks/useEntitlements';
import { isFeatureEnabled } from '../../lib/featureFlags';
import { SITE } from '../../landing/content';

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
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
        <Lock size={20} aria-hidden="true" />
      </div>
      <h2 id={`locked-${feature}`} className="text-lg font-bold text-ink">{title} isn’t in your plan</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {plan?.name ? `Your ${plan.name} plan doesn’t include ${title}.` : `Your plan doesn’t include ${title}.`}{' '}
        Upgrade to use it. Your records are not affected.
      </p>
      {upgradeUrl ? (
        <a href={upgradeUrl} target="_blank" rel="noopener noreferrer" className="btn-command mt-6 inline-flex justify-center">
          See plans and upgrade
        </a>
      ) : (
        <p className="mt-6 text-sm font-semibold text-ink">
          To upgrade, call us on <a href={`tel:${String(SITE.phone).replace(/\s/g, '')}`} className="text-brand underline">{SITE.phoneDisplay}</a>.
        </p>
      )}
    </section>
  );
}
