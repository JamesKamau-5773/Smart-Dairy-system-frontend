import { useEffect, useMemo, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { extractYieldAmount } from '../../lib/dashboardUtils';
import { milestoneKey, milestoneStatus, readFlag, writeFlag } from '../../lib/welcomeProgress';

/**
 * Congratulates the farm once each time its recorded milk crosses a milestone
 * (100 L, 1,000 L, ...). Remount with `key` when the farm changes.
 */
export default function MilestoneBanner({ tenantId, farmId, milkRecords, milkLoaded }) {
  const storageKey = milestoneKey(tenantId, farmId);
  const [acknowledged, setAcknowledged] = useState(() => readFlag(storageKey));

  const totalLitres = useMemo(
    () => (Array.isArray(milkRecords) ? milkRecords.reduce((sum, row) => sum + extractYieldAmount(row), 0) : 0),
    [milkRecords],
  );
  const status = milestoneStatus(acknowledged, totalLitres);

  // Adjust state during render (no extra effect pass); the effect below only persists it.
  if (milkLoaded && status.acknowledgeSilently) setAcknowledged(String(status.reached));

  useEffect(() => {
    if (acknowledged != null) writeFlag(storageKey, acknowledged);
  }, [acknowledged, storageKey]);

  if (!milkLoaded || !status.celebrate) return null;

  const acknowledge = () => setAcknowledged(String(status.reached));

  return (
    <section role="status" className="card-machined flex items-center gap-4 bg-brand/5 p-5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Trophy size={20} aria-hidden="true" />
      </span>
      <p className="flex-1 text-sm text-ink-900">
        <span className="block text-lg font-bold">
          <span className="font-mono">{status.reached.toLocaleString('en-KE')}</span> litres recorded!
        </span>
        Every one of them is on record. Keep it going.
      </p>
      <button type="button" onClick={acknowledge} className="btn-ghost h-11 w-11 shrink-0 border-transparent !p-0" aria-label="Dismiss milestone">
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
