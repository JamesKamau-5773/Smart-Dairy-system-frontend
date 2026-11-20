import { statusEmphasis } from '../../../lib/milkRecords';

const STYLE = {
  // Waiting for a check: present but quiet.
  outline: 'border border-ink-400 text-ink-600',
  // Needs action (flagged, or milk kept apart): the one solid mark in the list.
  solid: 'border border-ink-900 bg-ink-900 text-white',
};

/**
 * A milk record's status on the phone list, for exceptions only: Pending outlined, Flagged
 * and Isolated solid ink. Verified is the normal state and has no badge (renders nothing).
 */
export default function MilkStatusPill({ status, label }) {
  const emphasis = statusEmphasis(status);
  if (!emphasis) return null;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 text-badge ${STYLE[emphasis]}`}>
      {label}
    </span>
  );
}
