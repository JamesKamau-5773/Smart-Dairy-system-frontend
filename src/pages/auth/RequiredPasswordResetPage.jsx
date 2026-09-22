import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AlertBanner from '../../components/ui/AlertBanner';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultLandingPath } from '../../lib/roles';

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
      setError('Your new password must contain at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
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
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-brand/10 text-brand">
          <LockKeyhole size={22} aria-hidden="true" />
        </div>
        <h1 id="reset-password-title" className="font-display text-2xl font-semibold text-ink-strong">Set a private password</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Replace the temporary password before entering your farm workspace.</p>

        {error && <div className="mt-5"><AlertBanner type="danger" title="Password not updated" message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-xs font-semibold text-ink-normal">New password</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                autoComplete="new-password"
                className="glass-input w-full rounded-md px-4 py-3 pr-12 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-muted" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">Use at least 12 characters.</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold text-ink-normal">Confirm password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="glass-input w-full rounded-md px-4 py-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-command w-full py-3 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Updating password…' : 'Save password and continue'}
          </button>
        </form>
      </section>
    </main>
  );
}