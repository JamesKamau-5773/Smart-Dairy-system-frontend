import { useCallback, useState } from 'react';
import { authApi } from '../lib/backendApi';
import { describeAuthError } from '../lib/authErrorMessages';
import { secondsUntil } from '../lib/countdown';
import { useCountdown } from './useCountdown';
import { usePolling } from './usePolling';

// WhatsApp reverse-OTP verification (AUTH_API_CONTRACT §6) as a small state machine:
//
//   idle ─start→ starting ─→ pending ─poll→ verified | expired | locked | cancelled
//                    └──────→ error (start failed; start again)
//
// The pending challenge is kept in sessionStorage, so a phone that reloads the
// page on returning from WhatsApp resumes polling instead of issuing a new code
// (starting again would cancel the one the farmer just sent).

const STORAGE_KEY = 'maziwa_phone_verification';
const FINAL_STATUSES = new Set(['verified', 'expired', 'locked', 'cancelled']);
// Rate limit is 3 starts per 10 minutes, so make the second one wait a little.
export const RESEND_COOLDOWN_SECONDS = 60;

function readPending() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    return saved?.verification_id && secondsUntil(saved.expires_at) > 0 ? saved : null;
  } catch {
    return null;
  }
}

function writePending(verification) {
  try {
    if (verification) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(verification));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: a reload asks for a new code instead of resuming.
  }
}

export function usePhoneVerification() {
  const [verification, setVerification] = useState(readPending);
  const [phase, setPhase] = useState(() => (verification ? 'pending' : 'idle'));
  const [error, setError] = useState(null);
  const { seconds: expiresIn, startUntil: startExpiry } = useCountdown(verification?.expires_at ?? null);
  const { seconds: resendIn, startFor: startCooldown } = useCountdown();

  const finish = useCallback((status) => {
    writePending(null);
    setPhase(status);
  }, []);

  const start = useCallback(async (phoneNumber) => {
    setPhase('starting');
    setError(null);
    try {
      const started = await authApi.startPhoneVerification(phoneNumber);
      writePending(started);
      setVerification(started);
      startExpiry(started.expires_at ?? Date.now() + (started.expires_in_seconds ?? 600) * 1000);
      startCooldown(RESEND_COOLDOWN_SECONDS);
      setPhase('pending');
      return true;
    } catch (caught) {
      const details = describeAuthError(caught, 'phoneVerification');
      if (details.code === 'PHONE_ALREADY_VERIFIED') {
        finish('verified');
        return true;
      }
      if (details.retryAfter) startCooldown(details.retryAfter);
      setError(details);
      setPhase('error');
      return false;
    }
  }, [startCooldown, startExpiry, finish]);

  const checkStatus = useCallback(async () => {
    if (!verification) return true;
    if (secondsUntil(verification.expires_at) === 0) {
      finish('expired');
      return true;
    }
    try {
      const { status } = await authApi.phoneVerificationStatus(verification.verification_id);
      if (FINAL_STATUSES.has(status)) {
        finish(status);
        return true;
      }
      return false;
    } catch (caught) {
      const httpStatus = caught?.response?.status;
      // Unknown id (another device started a newer code) or a signed-out session: stop.
      if (httpStatus === 404) {
        finish('cancelled');
        return true;
      }
      return httpStatus === 401;
    }
  }, [verification, finish]);

  // The code can run out while polling is paused (screen off); derive that from the
  // clock rather than waiting for the next status check. Stored entries that have
  // expired are already ignored on load.
  const hasExpired = phase === 'pending' && expiresIn === 0 && secondsUntil(verification?.expires_at) === 0;
  const currentPhase = hasExpired ? 'expired' : phase;

  const checkNow = usePolling(checkStatus, { enabled: currentPhase === 'pending' });

  const reset = useCallback(() => {
    writePending(null);
    setVerification(null);
    setError(null);
    setPhase('idle');
  }, []);

  return {
    phase: currentPhase,
    verification,
    error,
    start,
    checkNow,
    reset,
    expiresIn,
    resendIn,
  };
}
