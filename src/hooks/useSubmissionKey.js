import { useCallback, useRef } from 'react';
import { createIdempotencyKey } from '../lib/apiClient';

/**
 * One Idempotency-Key per logical submission of a form.
 *
 * The backend replays the stored response when the same key arrives with the same body,
 * and rejects the key (`422 IDEMPOTENCY_KEY_REUSED`) when the body is different. So a key
 * must follow the exact submission:
 * - the same content submitted again (a retry, a double tap, a timed-out request) reuses
 *   the key, so the backend saves it once;
 * - changed content gets a fresh key;
 * - `reset()` after the entry is settled (saved, queued offline, or found to be a
 *   duplicate) so the next entry starts with a fresh key.
 *
 * @returns {{
 *   keyFor: (submission: object) => string,
 *   reset: () => void,
 * }} `keyFor` returns the key for this exact submission (JSON-serializable values only);
 *   `reset` forgets it.
 *
 * @example
 * const submissionKey = useSubmissionKey();
 * const key = submissionKey.keyFor({ cowId, amount, session, date });
 * await productionApi.createYield(payload, { headers: { 'Idempotency-Key': key } });
 * submissionKey.reset(); // after a confirmed save
 */
export function useSubmissionKey() {
  const current = useRef(null);

  const keyFor = useCallback((submission) => {
    const fingerprint = JSON.stringify(submission);
    if (current.current?.fingerprint !== fingerprint) {
      current.current = { fingerprint, key: createIdempotencyKey() };
    }
    return current.current.key;
  }, []);

  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { keyFor, reset };
}
