/** Whole seconds left until `deadline` (ms timestamp or ISO string), never negative. */
export function secondsUntil(deadline, now = Date.now()) {
  const target = typeof deadline === 'number' ? deadline : Date.parse(deadline ?? '');
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** 582 -> "9:42". */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
