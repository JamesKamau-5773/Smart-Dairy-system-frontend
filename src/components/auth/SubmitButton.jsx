import { Loader2 } from 'lucide-react';
import { authCopy } from '../../i18n/auth';

/**
 * Primary form button with the three states every auth action needs:
 * ready, working (spinner + label), and waiting out a rate limit.
 */
export default function SubmitButton({
  pending = false,
  pendingLabel = authCopy.common.working,
  retryIn = 0,
  disabled = false,
  className = '',
  type = 'submit',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn-command w-full gap-2 py-4 text-control ${className}`}
      disabled={pending || retryIn > 0 || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {pendingLabel}</>
      ) : retryIn > 0 ? (
        authCopy.common.waitSeconds(retryIn)
      ) : children}
    </button>
  );
}
