import { TONES } from './tones';

/**
 * A record's status as a small badge, in one of the app's tones (brand blue and ink only).
 * Pages map their statuses to a tone through a config (e.g. LEDGER_STATUS_STYLES), so a new
 * status is a config line, not a change here.
 *
 * label:  the status text, already in the reader's language
 * tone:   a key of TONES ('neutral' | 'info' | 'attention' | 'critical')
 * struck: true draws a line through the label (voided records)
 */
export function StatusBadge({ label, tone = 'neutral', struck = false }) {
  const chip = (TONES[tone] ?? TONES.neutral).chip;
  return (
    <span className={`inline-flex max-w-full items-center rounded-badge px-1.5 py-0.5 text-badge ${chip} ${struck ? 'line-through' : ''}`}>
      <span className="truncate">{label}</span>
    </span>
  );
}

export default StatusBadge;
