import { useDemoSession } from '../../hooks/useDemoSession';
import { useLeaveDemo } from '../../hooks/useLeaveDemo';
import DemoTimeLeft from './DemoTimeLeft';
import { shellCopy } from '../../i18n/shell';

const { demo: copy } = shellCopy;

/**
 * Tells a visitor on every app page that this is the public demo, with a way to their own farm.
 * Shown only when the backend says `is_demo: true`; leaving logs the demo session out first.
 * The time left counts down to the backend's `session_expires_at`, and is left out when it
 * didn't send one.
 */
export default function DemoBanner() {
  const { isDemo, expiresAt } = useDemoSession();
  const leave = useLeaveDemo();
  if (!isDemo) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-900 sm:px-6">
      {/* Only the message is a live region: the ticking time left would be read out every second. */}
      <p role="status" className="min-w-0 flex-1">{copy.banner}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {expiresAt && <DemoTimeLeft key={expiresAt} expiresAt={expiresAt} />}
        <button type="button" onClick={leave.toLogin} className="rounded-button px-3 py-1.5 font-semibold text-brand-900 hover:bg-brand-100">
          {copy.logIn}
        </button>
        <button type="button" onClick={leave.toRegister} className="btn-command px-3 py-1.5 text-sm">
          {copy.createFarm}
        </button>
      </div>
    </div>
  );
}
