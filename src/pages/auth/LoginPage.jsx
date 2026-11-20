import { useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthDivider from '../../components/auth/AuthDivider';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import SubmitButton from '../../components/auth/SubmitButton';
import { PasswordField, TextField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useCountdown } from '../../hooks/useCountdown';
import { getDefaultLandingPath } from '../../lib/roles';
import { getGateRoute } from '../../lib/authState';
import { forgetLogin, getLastLogin, maskIdentifier, rememberLogin } from '../../lib/lastLogin';
import { authCopy } from '../../i18n/auth';

const { login: copy, common } = authCopy;

export default function LoginPage() {
  const [rememberedLogin, setRememberedLogin] = useState(getLastLogin);
  const [identifier, setIdentifier] = useState(rememberedLogin);
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { seconds: retryIn, startFor: waitFor } = useCountdown();
  const identifierRef = useRef(null);
  const passwordRef = useRef(null);

  const online = useOnlineStatus();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const passwordUpdated = state?.notice === 'passwordUpdated';

  const switchAccount = () => {
    forgetLogin();
    setRememberedLogin('');
    setIdentifier('');
    // The identifier field mounts on the next render.
    setTimeout(() => identifierRef.current?.focus(), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!identifier.trim()) errors.identifier = copy.identifierRequired;
    if (!password) errors.password = authCopy.fields.passwordRequired;
    setFieldErrors(errors);
    if (errors.identifier) {
      identifierRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const result = await login({ login: identifier.trim(), password });

    if (result.success) {
      rememberLogin(identifier);
      navigate(getGateRoute(result.user) ?? getDefaultLandingPath(result.user), { replace: true });
    } else {
      setError(result.error);
      if (result.details?.retryAfter) waitFor(result.details.retryAfter);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      offline={!online}
      headerAction={<Link to="/register" className="btn-secondary text-control">{common.createAccount}</Link>}
    >
      <header className="mb-6">
        <h1 className="text-page-title text-ink-900">
          {rememberedLogin ? copy.titleReturning : copy.title}
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          {rememberedLogin ? copy.subtitleReturning : copy.subtitle}
        </p>
      </header>

      {passwordUpdated && !error && (
        <div className="mb-5">
          <AlertBanner type="success" message={copy.passwordUpdated} />
        </div>
      )}

      {error && (
        <div className="mb-5">
          <AlertBanner type="danger" title={copy.errorTitle} message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {rememberedLogin ? (
          <div className="flex items-center justify-between gap-3 rounded-card border border-brand/10 bg-brand/5 px-4 py-3">
            <span className="flex min-w-0 items-center text-body-strong text-ink-900">
              <span className="truncate tabular-nums">{maskIdentifier(rememberedLogin)}</span>
            </span>
            <button type="button" onClick={switchAccount} className="shrink-0 text-control text-brand underline-offset-4 hover:underline">
              {copy.notYou}
            </button>
            {/* Lets password managers pair the saved password with this account. */}
            <input type="text" name="username" autoComplete="username" value={identifier} readOnly hidden />
          </div>
        ) : (
          <TextField
            ref={identifierRef}
            id="login-identifier"
            name="username"
            type="text"
            label={copy.identifier}
            placeholder={copy.identifierPlaceholder}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={fieldErrors.identifier}
          />
        )}

        <div>
          <PasswordField
            ref={passwordRef}
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <Link
            to="/forgot-password"
            className="mt-2 inline-flex min-h-11 items-center text-body-strong text-brand underline-offset-4 hover:underline"
          >
            {copy.forgotPassword}
          </Link>
        </div>

        <SubmitButton pending={isSubmitting} pendingLabel={copy.submitting} retryIn={retryIn} disabled={!online}>
          {copy.submit}
        </SubmitButton>
      </form>

      <AuthDivider />
      <GoogleSignInButton next="/app" disabled={!online} />

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-body text-ink-muted">
        {copy.newHere}{' '}
        <Link to="/register" className="text-body-strong text-brand underline-offset-4 hover:underline">{copy.createFarmAccount}</Link>
      </p>
    </AuthLayout>
  );
}
