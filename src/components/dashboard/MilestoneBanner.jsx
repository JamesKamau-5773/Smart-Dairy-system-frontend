import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { milestoneKey, milestoneStatus, readFlag, writeFlag } from '../../lib/welcomeProgress';
import { dashboardCopy } from '../../i18n/dashboard';

/**
 * Congratulates the farm once each time its recorded milk crosses a milestone
 * (100 L, 1,000 L, ...). Remount with `key` when the farm changes.
 *
 * @param {object} props
 * @param {number|null} props.totalLitres The farm's all-time milk total from the backend; while
 *   unknown (null) nothing is shown or acknowledged.
 * @param {boolean} props.milkLoaded True once that total has loaded.
 */
export default function MilestoneBanner({ tenantId, farmId, totalLitres, milkLoaded }) {
  const storageKey = milestoneKey(tenantId, farmId);
  const [acknowledged, setAcknowledged] = useState(() => readFlag(storageKey));

  const known = milkLoaded && Number.isFinite(totalLitres);
  const status = milestoneStatus(acknowledged, known ? totalLitres : 0);

  // Adjust state during render (no extra effect pass); the effect below only persists it.
  if (known && status.acknowledgeSilently) setAcknowledged(String(status.reached));

  useEffect(() => {
    if (acknowledged != null) writeFlag(storageKey, acknowledged);
  }, [acknowledged, storageKey]);

  if (!known || !status.celebrate) return null;

  const acknowledge = () => setAcknowledged(String(status.reached));

  return (
    <section role="status" className="card-machined flex items-center gap-4 bg-brand/5 p-5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Trophy size={20} aria-hidden="true" />
      </span>
      <p className="flex-1 text-sm text-ink-900">
        <span className="block text-lg font-bold">
          <span className="font-mono">{status.reached.toLocaleString('en-KE')}</span> {dashboardCopy.milestone.reached}
        </span>
        {dashboardCopy.milestone.message}
      </p>
      <button type="button" onClick={acknowledge} className="btn-ghost h-11 w-11 shrink-0 border-transparent !p-0" aria-label={dashboardCopy.milestone.dismiss}>
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
