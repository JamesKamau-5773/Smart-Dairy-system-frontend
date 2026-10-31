import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, MessageCircle, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import { PasswordField, TextField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getDefaultLandingPath } from '../../lib/roles';
import { forgetLogin, getLastLogin, maskIdentifier, rememberLogin } from '../../lib/lastLogin';
import { SITE } from '../../landing/content';

const FORGOT_PASSWORD_HREF = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hello, I forgot my Maziwa Smart password. Please help me reset it.')}`;

export default function LoginPage() {
  const [rememberedLogin, setRememberedLogin] = useState(getLastLogin);
  const [username, setUsername] = useState(rememberedLogin);
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const online = useOnlineStatus();
  const { login } = useAuth();
  const navigate = useNavigate();

  const switchAccount = () => {
    forgetLogin();
    setRememberedLogin('');
    setUsername('');
    // The username field mounts on the next render.
    setTimeout(() => usernameRef.current?.focus(), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!username.trim()) errors.username = 'Enter your phone number or username.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (errors.username) {
      usernameRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const result = await login({ username: username.trim(), password });

    if (result.success) {
      rememberLogin(username);
      navigate(result.user?.requires_password_reset ? '/reset-required-password' : getDefaultLandingPath(result.user), { replace: true });
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      offline={!online}
      headerAction={<Link to="/register" className="btn-secondary text-sm">Create account</Link>}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {rememberedLogin ? 'Karibu tena' : 'Log in to your farm'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {rememberedLogin ? 'Welcome back. Enter your password to open your farm.' : 'Use the phone number or username you signed up with.'}
        </p>
      </header>

      {error && (
        <div className="mb-5">
          <AlertBanner type="danger" title="Couldn’t log in" message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {rememberedLogin ? (
          <div className="flex items-center justify-between gap-3 rounded-card border border-brand/10 bg-brand/5 px-4 py-3">
            <span className="flex min-w-0 items-center gap-3 text-sm font-semibold text-ink-900">
              <UserRound size={18} className="shrink-0 text-brand" aria-hidden="true" />
              <span className="truncate font-mono">{maskIdentifier(rememberedLogin)}</span>
            </span>
            <button type="button" onClick={switchAccount} className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
              Not you?
            </button>
            {/* Lets password managers pair the saved password with this account. */}
            <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
          </div>
        ) : (
          <TextField
            ref={usernameRef}
            id="login-username"
            name="username"
            label="Phone number or username"
            placeholder="e.g. 0712 345 678"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
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
          <a
            href={FORGOT_PASSWORD_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <MessageCircle size={16} aria-hidden="true" /> Forgot password? Chat with us on WhatsApp
          </a>
        </div>

        <button type="submit" className="btn-command w-full gap-2 py-4 text-base" disabled={isSubmitting || !online}>
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Logging in…</> : 'Log in'}
        </button>
      </form>

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-sm text-ink-muted">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand underline-offset-4 hover:underline">Create your farm account</Link>
      </p>
    </AuthLayout>
  );
}
