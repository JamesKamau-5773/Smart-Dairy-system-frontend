import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { commonCopy } from '../../i18n/common';

/**
 * Shown over the current page when the server rejects the session. The page underneath stays
 * mounted, so anything the farmer typed is still there after signing in again.
 */
export default function SessionExpiredSheet() {
  const { currentUser, sessionExpired, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pendingCount } = useOfflineQueue();

  if (!sessionExpired || !currentUser) return null;

  const identifier = username || currentUser.username || currentUser.phone_number || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError(commonCopy.session.missing);
      return;
    }
    setIsSubmitting(true);
    setError('');
    const result = await login({ username: identifier.trim(), password });
    setIsSubmitting(false);
    if (result.success) {
      setPassword('');
      setUsername('');
    } else {
      setError(result.error);
    }
  };

  return createPortal(
    // Above every dialog (the milk form uses z-[9999]) so it can't be hidden behind the form it protects.
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-ink-900/50 p-4 sm:items-center">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="w-full max-w-sm space-y-4 rounded-modal border border-ink/10 bg-white p-6"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-50 p-2.5 text-brand" aria-hidden="true"><LockKeyhole size={20} /></span>
          <div>
            <h2 id="session-expired-title" className="text-lg font-bold text-ink">{commonCopy.session.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {commonCopy.session.message}
            </p>
          </div>
        </div>

        <label className="block text-sm font-semibold text-ink" htmlFor="session-username">
          {commonCopy.session.identifier}
          <input
            id="session-username"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setUsername(event.target.value)}
            className="input-machined mt-1 w-full"
          />
        </label>
        <label className="block text-sm font-semibold text-ink" htmlFor="session-password">
          {commonCopy.session.password}
          <input
            id="session-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-machined mt-1 w-full"
            autoFocus
          />
        </label>

        {error && <p role="alert" className="text-sm text-danger-900">{error}</p>}
        {pendingCount > 0 && (
          <p className="rounded-input bg-warning-50 p-3 text-sm text-ink">
            {commonCopy.session.pending(pendingCount)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={isSubmitting} className="btn-command w-full justify-center disabled:opacity-60">
            {isSubmitting ? commonCopy.session.signingIn : commonCopy.session.signIn}
          </button>
          <button type="button" onClick={logout} className="w-full rounded-button px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-ink/5">
            {commonCopy.session.signOut}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
