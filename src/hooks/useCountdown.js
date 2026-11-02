import { useCallback, useEffect, useState } from 'react';
import { secondsUntil } from '../lib/countdown';

/**
 * Seconds remaining until a deadline, ticking once a second. Used for
 * Retry-After waits, resend cooldowns and code expiry.
 */
export function useCountdown(initialDeadline = null) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [seconds, setSeconds] = useState(() => (initialDeadline ? secondsUntil(initialDeadline) : 0));

  useEffect(() => {
    if (!deadline) return undefined;
    let id = null;
    const tick = () => {
      const remaining = secondsUntil(deadline);
      setSeconds(remaining);
      if (remaining === 0) clearInterval(id);
    };
    id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [deadline]);

  const startFor = useCallback((durationSeconds) => setDeadline(Date.now() + durationSeconds * 1000), []);
  const startUntil = useCallback((until) => setDeadline(until), []);
  const clear = useCallback(() => {
    setDeadline(null);
    setSeconds(0);
  }, []);

  return { seconds, startFor, startUntil, clear };
}
