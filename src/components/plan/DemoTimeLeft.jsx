import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useCountdown } from '../../hooks/useCountdown';
import { useLeaveDemo } from '../../hooks/useLeaveDemo';
import { authApi } from '../../lib/backendApi';
import { formatClock } from '../../lib/countdown';
import { SESSION_EXPIRED_EVENT } from '../../lib/sessionEvents';
import { shellCopy } from '../../i18n/shell';

const { demo: copy } = shellCopy;

// From here on the banner shows minutes and seconds, and the visitor gets one warning.
const ENDING_SOON_SECONDS = 5 * 60;
const DEMO_ENDING_TOAST_ID = 'demo-ending';

/** "12 min" while there's time, "4:59" in the last minutes. */
const formatTimeLeft = (seconds) => (
  seconds > ENDING_SOON_SECONDS ? copy.minutes(Math.ceil(seconds / 60)) : formatClock(seconds)
);

/**
 * Time left in the demo session, counted down to the backend's `session_expires_at`.
 * Remount it (key) when the session changes, e.g. after "Restart demo".
 */
export default function DemoTimeLeft({ expiresAt }) {
  const { seconds } = useCountdown(expiresAt);
  const leave = useLeaveDemo();
  const warned = useRef(false);
  const checkedEnd = useRef(false);

  useEffect(() => {
    if (seconds <= 0 || seconds > ENDING_SOON_SECONDS || warned.current) return;
    warned.current = true;
    toast((t) => (
      <span className="flex flex-col gap-2">
        <span>{copy.endingSoon(Math.ceil(seconds / 60))}</span>
        <button
          type="button"
          className="btn-command self-start px-3 py-1.5 text-control"
          onClick={() => { toast.dismiss(t.id); leave.toRegister(); }}
        >
          {copy.createFarm}
        </button>
      </span>
    ), { id: DEMO_ENDING_TOAST_ID, duration: 10000 });
  }, [seconds, leave]);

  // At zero the server decides: only its 401 ends the session, so a phone clock that runs fast
  // can't close a demo that is still open.
  useEffect(() => {
    if (seconds > 0 || checkedEnd.current) return;
    checkedEnd.current = true;
    authApi.me().catch((error) => {
      if (error?.response?.status === 401) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    });
  }, [seconds]);

  const endingSoon = seconds <= ENDING_SOON_SECONDS;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-badge px-2 py-1 text-meta tabular-nums ${endingSoon ? 'bg-warning-50 text-ink' : 'bg-brand-100 text-brand-900'}`}>
      {copy.endsIn(formatTimeLeft(seconds))}
    </span>
  );
}
