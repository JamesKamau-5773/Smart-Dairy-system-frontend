import { useCallback, useEffect, useRef, useState } from 'react';
import { describeAuthError } from '../lib/authErrorMessages';
import { useCountdown } from './useCountdown';

/**
 * Loading, error and rate-limit state for one auth action, so every button
 * behaves the same: a spinner while pending, a readable error on failure, and
 * a countdown when the server asks us to wait (Retry-After).
 *
 * `run` never throws; it resolves to `{ ok: true, data }` or `{ ok: false, error }`.
 */
export function useAsyncAction(action, flow) {
  const actionRef = useRef(action);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const { seconds: retryIn, startFor } = useCountdown();

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const run = useCallback(async (...args) => {
    setPending(true);
    setError(null);
    try {
      const data = await actionRef.current(...args);
      return { ok: true, data };
    } catch (caught) {
      const details = describeAuthError(caught, flow);
      setError(details);
      if (details.retryAfter) startFor(details.retryAfter);
      return { ok: false, error: details };
    } finally {
      setPending(false);
    }
  }, [flow, startFor]);

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError, retryIn };
}
