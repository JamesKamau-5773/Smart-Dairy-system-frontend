import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getPlanErrorMessage } from '../../lib/apiErrors';
import { DEMO_REFUSED_EVENT } from '../../lib/sessionEvents';
import { useLeaveDemo } from '../../hooks/useLeaveDemo';
import { shellCopy } from '../../i18n/shell';

const { demo: copy } = shellCopy;

// One id: several refused requests at once (a form plus its refetch) show one prompt, not a stack.
export const DEMO_REFUSAL_TOAST_ID = 'demo-refused';

/**
 * Turns the backend's demo refusals (DEMO_READ_ONLY, DEMO_FEATURE_UNAVAILABLE), noticed by the
 * API clients, into a friendly sign-up prompt. Mounted once in the app shell; renders nothing.
 */
export default function DemoRefusalNotice() {
  const leave = useLeaveDemo();

  useEffect(() => {
    const onRefused = (event) => {
      const message = getPlanErrorMessage(event.detail?.error);
      if (!message) return;
      toast((t) => (
        <span className="flex flex-col gap-2">
          <span>{message}</span>
          <button
            type="button"
            className="btn-command self-start px-3 py-1.5 text-control"
            onClick={() => { toast.dismiss(t.id); leave.toRegister(); }}
          >
            {copy.createFarm}
          </button>
        </span>
      ), { id: DEMO_REFUSAL_TOAST_ID, duration: 6000 });
    };
    window.addEventListener(DEMO_REFUSED_EVENT, onRefused);
    return () => window.removeEventListener(DEMO_REFUSED_EVENT, onRefused);
  }, [leave]);

  return null;
}
