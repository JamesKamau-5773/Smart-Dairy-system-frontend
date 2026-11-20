import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useDemoSession } from '../../hooks/useDemoSession';
import { useLeaveDemo } from '../../hooks/useLeaveDemo';
import { commonCopy } from '../../i18n/common';
import { shellCopy } from '../../i18n/shell';

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
  const { isDemo } = useDemoSession();

  if (!sessionExpired || !currentUser) return null;
  // A demo visitor has no password to re-enter: offer a fresh demo or their own farm instead.
  if (isDemo) return <DemoSessionEndedSheet />;

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
        <div>
          <h2 id="session-expired-title" className="text-section-title text-ink">{commonCopy.session.title}</h2>
          <p className="mt-1 text-body text-ink-muted">
            {commonCopy.session.message}
          </p>
        </div>

        <label className="block text-field-label text-ink-muted" htmlFor="session-username">
          {commonCopy.session.identifier}
          <input
            id="session-username"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setUsername(event.target.value)}
            className="input-machined mt-1 w-full"
          />
        </label>
        <label className="block text-field-label text-ink-muted" htmlFor="session-password">
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

        {error && <p role="alert" className="text-body text-danger-900">{error}</p>}
        {pendingCount > 0 && (
          <p className="rounded-input bg-warning-50 p-3 text-body text-ink">
            {commonCopy.session.pending(pendingCount)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={isSubmitting} className="btn-command w-full justify-center disabled:opacity-60">
            {isSubmitting ? commonCopy.session.signingIn : commonCopy.session.signIn}
          </button>
          <button type="button" onClick={logout} className="w-full rounded-button px-4 py-2 text-control text-ink-muted hover:bg-ink/5">
            {commonCopy.session.signOut}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/**
 * The demo's own "session ended" sheet: restart the demo, create a farm, or go back home.
 * Restarting keeps the visitor on the page they were on, as signing in again does above.
 */
function DemoSessionEndedSheet() {
  const { startDemo } = useAuth();
  const leave = useLeaveDemo();
  const [error, setError] = useState('');
  const [isRestarting, setIsRestarting] = useState(false);
  const copy = shellCopy.demo;

  const restart = async () => {
    setIsRestarting(true);
    setError('');
    const result = await startDemo();
    // On success the sheet closes (the session is no longer expired); only a failure stays here.
    if (!result.success) {
      setIsRestarting(false);
      setError(result.error);
    }
  };

  return createPortal(
    // Same layer as the sign-in sheet above.
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-ink-900/50 p-4 sm:items-center">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-ended-title"
      className="w-full max-w-sm space-y-4 rounded-modal border border-ink/10 bg-white p-6"
    >
      <div>
        <h2 id="demo-ended-title" className="text-section-title text-ink">{copy.expiredTitle}</h2>
        <p className="mt-1 text-body text-ink-muted">{copy.expiredMessage}</p>
      </div>

      {error && <p role="alert" className="text-body text-danger-900">{error}</p>}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={leave.toRegister} className="btn-command w-full justify-center">
          {copy.createFarm}
        </button>
        <button type="button" onClick={restart} disabled={isRestarting} aria-busy={isRestarting || undefined} className="btn-secondary w-full justify-center disabled:opacity-60">
          {isRestarting ? copy.restarting : copy.restart}
        </button>
        <button type="button" onClick={leave.toHome} className="w-full rounded-button px-4 py-2 text-control text-ink-muted hover:bg-ink/5">
          {copy.backHome}
        </button>
      </div>
    </div>
    </div>,
    document.body,
  );
}
