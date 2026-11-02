import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordStrength from '../../components/auth/PasswordStrength';
import SubmitButton from '../../components/auth/SubmitButton';
import { PasswordField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useOneTimeUrlToken } from '../../hooks/useOneTimeUrlToken';
import { authApi } from '../../lib/backendApi';
import { validateNewPassword } from '../../lib/authValidation';
import { authCopy } from '../../i18n/auth.en';

const { reset: copy, fields, common } = authCopy;

/**
 * Where WhatsApp, email and admin reset links all land (AUTH_API_CONTRACT §7.3).
 * The link is checked first so an expired one says so before anything is typed.
 */
export default function ResetPasswordPage() {
  const token = useOneTimeUrlToken();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { currentUser, logout } = useAuth();

  const [linkState, setLinkState] = useState(token ? 'checking' : 'invalid');
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [violations, setViolations] = useState([]);
  const validate = useAsyncAction(authApi.validateResetToken, 'passwordReset');
  const save = useAsyncAction(authApi.resetPassword, 'passwordReset');
  const { run: runValidate } = validate;

  const checkLink = useCallback(async () => {
    const result = await runValidate(token);
    if (result.ok) setLinkState(result.data?.valid === false ? 'invalid' : 'valid');
    else setLinkState(result.error.code === 'RESET_TOKEN_INVALID' ? 'invalid' : 'unchecked');
  }, [token, runValidate]);

  // Once per link; StrictMode re-runs effects in development.
  const checked = useRef(false);
  useEffect(() => {
    if (!token || checked.current) return;
    checked.current = true;
    checkLink();
  }, [token, checkLink]);

  const retryCheck = () => {
    setLinkState('checking');
    checkLink();
  };

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    if (name === 'password') setViolations([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateNewPassword(form);
    setFieldErrors(errors);
    const firstInvalid = ['password', 'confirm_password'].find((name) => errors[name]);
    if (firstInvalid) {
      event.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    const result = await save.run({ token, ...form });
    if (result.ok) {
      // Every session for this account was just revoked, including any on this device.
      if (currentUser) await logout();
      navigate('/login', { replace: true, state: { notice: 'passwordUpdated' } });
      return;
    }
    if (result.error.code === 'RESET_TOKEN_INVALID') {
      setLinkState('invalid');
      return;
    }
    setViolations(result.error.passwordViolations);
    setFieldErrors(result.error.fieldErrors);
  };

  const serverBanner = save.error && !Object.keys(save.error.fieldErrors).length ? save.error.message : '';

  return (
    <AuthLayout offline={!online}>
      {/* Keeps the reset token out of the Referer header of anything this page loads. */}
      <meta name="referrer" content="no-referrer" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {linkState === 'invalid' ? copy.invalidTitle : copy.title}
        </h1>
        {linkState !== 'invalid' && <p className="mt-2 text-sm text-ink-muted">{copy.subtitle}</p>}
      </header>

      {linkState === 'checking' && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.checking}
        </p>
      )}

      {linkState === 'unchecked' && (
        <div className="space-y-5">
          <AlertBanner type="danger" message={validate.error?.message} />
          <SubmitButton type="button" onClick={retryCheck} retryIn={validate.retryIn} disabled={!online}>{common.tryAgain}</SubmitButton>
        </div>
      )}

      {linkState === 'invalid' && (
        <div className="space-y-5">
          <p className="text-sm text-ink-muted">{copy.invalid}</p>
          <Link to="/forgot-password" className="btn-command w-full py-4 text-base">{copy.requestNew}</Link>
        </div>
      )}

      {linkState === 'valid' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <PasswordField
            id="reset-password"
            name="password"
            label={fields.newPassword}
            autoComplete="new-password"
            value={form.password}
            onChange={setField('password')}
            error={fieldErrors.password}
          >
            <PasswordStrength password={form.password} serverViolations={violations} />
          </PasswordField>

          <PasswordField
            id="reset-confirm-password"
            name="confirm_password"
            label={fields.confirmPassword}
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={setField('confirm_password')}
            error={fieldErrors.confirm_password}
          />

          {serverBanner && <AlertBanner type="danger" title={copy.errorTitle} message={serverBanner} />}

          <SubmitButton pending={save.pending} pendingLabel={copy.submitting} retryIn={save.retryIn} disabled={!online}>
            {copy.submit}
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-semibold text-brand underline-offset-4 hover:underline">{common.backToLogin}</Link>
      </p>
    </AuthLayout>
  );
}
