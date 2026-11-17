import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOneTimeUrlToken } from '../../hooks/useOneTimeUrlToken';
import { authApi } from '../../lib/backendApi';
import { getAuthErrorMessage } from '../../lib/authErrorMessages';
import SubmitButton from '../../components/auth/SubmitButton';
import { authCopy } from '../../i18n/auth';

const { verifyEmail: copy, common } = authCopy;

/** Target of the email verification link: `/verify-email?token=…` (AUTH_API_CONTRACT §8). */
export default function VerifyEmailPage() {
  const token = useOneTimeUrlToken();
  const online = useOnlineStatus();
  const { currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState(token ? 'checking' : 'invalid');
  const [error, setError] = useState('');
  const refreshRef = useRef(refreshUser);
  const signedIn = Boolean(currentUser);
  useEffect(() => {
    refreshRef.current = refreshUser;
  }, [refreshUser]);

  const confirm = useCallback(() => {
    setError('');
    authApi.confirmEmailVerification(token)
      .then(() => {
        setStatus('verified');
        if (signedIn) refreshRef.current().catch(() => {});
      })
      .catch((caught) => {
        // Only a definite answer from the server means the link is bad; a dropped
        // connection can be retried with the same link.
        if (caught?.response?.status === 400) setStatus('invalid');
        else setError(getAuthErrorMessage(caught));
      });
  }, [token, signedIn]);

  // The token works once, so it must be sent exactly once, even under StrictMode.
  const sent = useRef(false);
  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    confirm();
  }, [token, confirm]);

  return (
    <AuthLayout offline={!online}>
      <meta name="referrer" content="no-referrer" />

      {status === 'checking' && !error && (
        <p role="status" className="flex items-center gap-2 text-body text-ink-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.checking}
        </p>
      )}

      {status === 'checking' && error && (
        <div className="space-y-5">
          <AlertBanner type="danger" message={error} />
          <SubmitButton type="button" onClick={confirm} disabled={!online}>{common.tryAgain}</SubmitButton>
        </div>
      )}

      {status !== 'checking' && (
        <div className="space-y-5">
          <AlertBanner
            type={status === 'verified' ? 'success' : 'warning'}
            title={status === 'verified' ? copy.successTitle : copy.invalidTitle}
            message={status === 'verified' ? copy.success : copy.invalid}
          />
          <Link to={signedIn ? '/app' : '/login'} className="btn-command w-full py-4 text-control">
            {signedIn ? copy.continueApp : common.logIn}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
