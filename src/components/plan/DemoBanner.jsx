import { FlaskConical } from 'lucide-react';
import { useEntitlements } from '../../hooks/useEntitlements';
import { isFeatureEnabled } from '../../lib/featureFlags';
import { shellCopy } from '../../i18n/shell';

const { plan: copy } = shellCopy;

/**
 * Tells everyone using the demo farm that it is a demo, on every app page. Shown only when the
 * backend says `is_demo: true`; nothing is shown while that is unknown.
 */
export default function DemoBanner() {
  const { isDemo } = useEntitlements();
  if (!isFeatureEnabled('planIndicators') || isDemo !== true) return null;

  return (
    <div role="status" className="flex items-start gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-900 sm:px-6">
      <FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        <strong className="font-semibold">{copy.demoTitle}</strong>{' '}
        {copy.demoMessage}
      </p>
    </div>
  );
}
