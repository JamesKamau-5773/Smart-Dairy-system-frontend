import { AlertTriangle, CheckCircle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { productionCopy } from '../../i18n/production';

// Each status has its own icon as well as its colour, so it never rests on colour alone.
const STYLES = {
  Verified: { tone: 'border-brand/30 bg-brand/5 text-brand', Icon: CheckCircle },
  Pending: { tone: 'border-ink-300 bg-ink-50 text-ink-600', Icon: RefreshCcw },
  Flagged: { tone: 'border-danger-500/30 bg-danger-50 text-danger-900', Icon: AlertTriangle },
};
const OTHER = { tone: 'border-ink-200 bg-ink-50 text-ink-700', Icon: ShieldCheck };

/** A milk record's status (normalized: Verified, Pending, Flagged, Isolated); "—" when the backend sent none. */
export default function MilkStatusBadge({ status }) {
  if (!status) return <span className="text-xs text-ink-muted">—</span>;
  const { tone, Icon } = STYLES[status] ?? OTHER;
  return (
    <span className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 font-sans text-[11px] font-semibold ${tone}`}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" /> {productionCopy.statuses[status] ?? status}
    </span>
  );
}
