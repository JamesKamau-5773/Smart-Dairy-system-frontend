import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import GoogleSignupForm from '../../components/auth/GoogleSignupForm';
import SubmitButton from '../../components/auth/SubmitButton';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getGateRoute, safeNextPath } from '../../lib/authState';
import { getAuthErrorMessage } from '../../lib/authErrorMessages';
import { authCopy } from '../../i18n/auth';

const { google: copy, common } = authCopy;

// Results where the backend already set the session cookie (contract §5.2).
const SIGNED_IN_RESULTS = new Set(['signed_in', 'phone_verification_required']);

/** Landing page for the backend's Google redirect: `/auth/google/complete?result=…`. */
export default function GoogleCompletePage() {
  const [params] = useSearchParams();
  const result = params.get('result');
  const errorCode = params.get('error_code');
  const next = safeNextPath(params.get('next'));
  const online = useOnlineStatus();

  return (
    <AuthLayout offline={!online} headerAction={<Link to="/login" className="btn-secondary text-control">{common.logIn}</Link>}>
      {SIGNED_IN_RESULTS.has(result) ? (
        <CompleteSignIn next={next} />
      ) : result === 'signup_required' ? (
        <GoogleSignupForm next={next} online={online} />
      ) : result === 'link_required' ? (
        <Outcome type="info" title={copy.linkRequiredTitle} message={copy.linkRequired}>
          <Link to="/login" className="btn-command w-full py-4 text-control">{common.logIn}</Link>
        </Outcome>
      ) : result === 'linked' ? (
        <Outcome type="success" title={copy.linkedTitle} message={copy.linked}>
          <Link to={next} className="btn-command w-full py-4 text-control">{common.continue}</Link>
        </Outcome>
      ) : (
        <Outcome type="danger" title={copy.errorTitle} message={copy.errors[errorCode] ?? copy.errors.default}>
          <GoogleSignInButton next={next} disabled={!online} />
          <Link to="/login" className="btn-ghost w-full">{common.backToLogin}</Link>
        </Outcome>
      )}
    </AuthLayout>
  );
}

function Outcome({ type, title, message, children }) {
  return (
    <div className="space-y-5">
      <AlertBanner type={type} title={title} message={message} />
      {children}
    </div>
  );
}

/** The cookie is set; load the account and send the farmer on (or to the phone gate). */
function CompleteSignIn({ next }) {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const refreshRef = useRef(refreshUser);
  useEffect(() => {
    refreshRef.current = refreshUser;
  }, [refreshUser]);

  const finish = useCallback(async () => {
    try {
      const user = await refreshRef.current();
      navigate(getGateRoute(user) ?? next, { replace: true });
    } catch (caught) {
      setError(getAuthErrorMessage(caught, 'login'));
    }
  }, [navigate, next]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finish();
  }, [finish]);

  if (error) {
    return (
      <Outcome type="danger" title={copy.errorTitle} message={error}>
        <SubmitButton type="button" onClick={() => { setError(''); finish(); }}>{common.tryAgain}</SubmitButton>
        <Link to="/login" className="btn-ghost w-full">{common.backToLogin}</Link>
      </Outcome>
    );
  }

  return (
    <p role="status" className="flex items-center gap-2 text-body text-ink-muted">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.completing}
    </p>
  );
}
