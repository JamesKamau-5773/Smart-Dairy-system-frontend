import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AlertBanner from '../../components/ui/AlertBanner';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultLandingPath } from '../../lib/roles';
import { adminCopy } from '../../i18n/admin';

const copy = adminCopy.requiredReset;
export default function RequiredPasswordResetPage() {
  const { completeRequiredPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 12) {
      setError(copy.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    setIsSubmitting(true);
    const result = await completeRequiredPasswordReset({ password, confirm_password: confirmPassword });

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    navigate(result.user?.requires_password_reset ? '/reset-required-password' : getDefaultLandingPath(result.user), { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-warm px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-ink-200 bg-surface-strong p-6 sm:p-8" aria-labelledby="reset-password-title">
        <h1 id="reset-password-title" className="text-page-title text-ink-strong">{copy.title}</h1>
        <p className="mt-2 text-body text-ink-muted">{copy.subtitle}</p>

        {error && <div className="mt-5"><AlertBanner type="danger" title={copy.errorTitle} message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-field-label text-ink-muted">{copy.newPassword}</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                autoComplete="new-password"
                className="input-machined w-full text-control pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-muted" aria-label={showPassword ? copy.hidePasswords : copy.showPasswords}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-1.5 text-meta text-ink-muted">{copy.hint}</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-field-label text-ink-muted">{copy.confirmPassword}</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="input-machined w-full text-control"
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-command w-full py-3 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? copy.saving : copy.submit}
          </button>
        </form>
      </section>
    </main>
  );
}