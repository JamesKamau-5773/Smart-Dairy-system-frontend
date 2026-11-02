import { useCallback, useEffect, useRef } from 'react';

// Quick checks while the farmer is likely still in WhatsApp, then a gentler pace.
// Both stay inside the contract's 3–5 s guidance and 60/min status limit.
export const defaultPollDelay = (attempt) => (attempt < 10 ? 3000 : 5000);

const canPoll = () => !document.hidden && navigator.onLine !== false;

/**
 * Runs `task` repeatedly while `enabled`, until it returns true.
 *
 * Saves data and battery on phones: it pauses while the page is hidden or
 * offline, and checks immediately when the farmer comes back (for example
 * from WhatsApp) instead of waiting for the next tick. A failed attempt is
 * retried on the normal schedule. Returns `pollNow` for a manual check.
 */
export function usePolling(task, { enabled, delayFor = defaultPollDelay }) {
  const taskRef = useRef(task);
  const pollNowRef = useRef(() => {});

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let running = false;
    let attempt = 0;
    let timer = null;

    const schedule = () => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(run, delayFor(attempt));
    };

    async function run() {
      if (stopped || running) return;
      // Paused: the visibility/online listeners restart the loop.
      if (!canPoll()) return;
      running = true;
      try {
        if (await taskRef.current()) stopped = true;
      } catch {
        // Keep polling; the task reports its own errors.
      } finally {
        running = false;
        attempt += 1;
      }
      schedule();
    }

    const resume = () => {
      if (stopped || !canPoll()) return;
      clearTimeout(timer);
      run();
    };

    pollNowRef.current = resume;
    schedule();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);

    return () => {
      stopped = true;
      clearTimeout(timer);
      pollNowRef.current = () => {};
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [enabled, delayFor]);

  return useCallback(() => pollNowRef.current(), []);
}
