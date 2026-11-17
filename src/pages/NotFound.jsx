import { Link, useLocation, useNavigate } from 'react-router-dom';
import { shellCopy } from '../i18n/shell';

const { notFound: copy } = shellCopy;

/**
 * Shown for an address the app doesn't have, instead of silently sending the farmer elsewhere.
 *
 * @param {object} props
 * @param {'app'|'public'} [props.variant] `app`: inside the app shell for a signed-in user, with
 *   a way home. `public`: a full screen for someone not signed in, with a way to log in.
 * @param {string} [props.homePath] Where "Go to your dashboard" leads (the user's landing page).
 */
export default function NotFound({ variant = 'app', homePath = '/app' }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPublic = variant === 'public';
  // A fresh tab has nothing to go back to; "Back" would leave the app.
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  const content = (
    <section aria-labelledby="not-found-title" className="mx-auto w-full max-w-md rounded-card border border-ink/10 bg-surface p-6 text-center sm:p-8">
      <h1 id="not-found-title" className="text-page-title text-ink">{copy.title}</h1>
      <p className="mt-2 text-body text-ink-muted">
        {copy.message}
      </p>
      <p className="mt-3 break-all text-meta text-ink-muted tabular-nums">{pathname}</p>
      <div className="mt-6 flex flex-col gap-3">
        {isPublic ? (
          <Link to="/login" className="btn-command justify-center">{copy.goToLogin}</Link>
        ) : (
          <Link to={homePath} className="btn-command justify-center">{copy.goToDashboard}</Link>
        )}
        {canGoBack && (
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary inline-flex min-h-11 items-center justify-center">
            {copy.back}
          </button>
        )}
      </div>
    </section>
  );

  if (!isPublic) return <div className="py-8">{content}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-surface-warm p-4">{content}</main>;
}
