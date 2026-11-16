import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import SubmitButton from '../../components/auth/SubmitButton';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useCountdown } from '../../hooks/useCountdown';
import { getDefaultLandingPath } from '../../lib/roles';
import { getGateRoute } from '../../lib/authState';
import { secondsUntil } from '../../lib/countdown';
import { authCopy } from '../../i18n/auth';

const { demo: copy } = authCopy;

const landingPathFor = (user) => getGateRoute(user) ?? getDefaultLandingPath(user);

// How long this demo has, read from the backend's `session_expires_at`; no length is assumed here.
const readyMessage = (user) => {
  const seconds = secondsUntil(user?.session_expires_at);
  return seconds > 0 ? copy.readyFor(Math.ceil(seconds / 60)) : copy.ready;
};

/**
 * Where the landing page's "Try the live demo" leads. Starts a demo session as soon as it opens,
 * then continues exactly like a password login. Someone already signed in goes to their own app
 * instead, so a real session is never replaced by the demo.
 */
export default function DemoStartPage() {
  const { currentUser, isLoading, startDemo } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { seconds: retryIn, startFor: waitFor } = useCountdown();
  // Empty while starting; the failure message otherwise.
  const [error, setError] = useState('');
  const startDemoRef = useRef(startDemo);
  useEffect(() => {
    startDemoRef.current = startDemo;
  }, [startDemo]);

  const run = useCallback(async () => {
    const result = await startDemoRef.current();
    if (result.success) {
      toast.success(readyMessage(result.user), { duration: 6000 });
      navigate(landingPathFor(result.user), { replace: true });
      return;
    }
    setError(result.error);
    if (result.details?.retryAfter) waitFor(result.details.retryAfter);
  }, [navigate, waitFor]);

  const retry = () => {
    setError('');
    run();
  };

  const started = useRef(false);
  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    if (currentUser) {
      navigate(landingPathFor(currentUser), { replace: true });
      return;
    }
    run();
  }, [isLoading, currentUser, navigate, run]);

  return (
    <AuthLayout offline={!online}>
      {!error ? (
        <p role="status" className="flex items-center justify-center gap-3 py-12 text-base font-semibold text-ink-900">
          <Loader2 size={20} className="animate-spin text-brand" aria-hidden="true" />
          {copy.starting}
        </p>
      ) : (
        <div className="space-y-5">
          <AlertBanner type="danger" title={copy.failedTitle} message={error} />
          <SubmitButton type="button" onClick={retry} retryIn={retryIn}>
            {copy.retry}
          </SubmitButton>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link to="/register" className="btn-secondary">{copy.createFarm}</Link>
            {/* Plain link: "/" is the static landing page, outside the SPA router. */}
            <a href="/" className="font-semibold text-brand underline-offset-4 hover:underline">{copy.backHome}</a>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
