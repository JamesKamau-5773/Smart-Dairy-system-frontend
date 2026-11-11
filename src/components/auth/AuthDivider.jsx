import { authCopy } from '../../i18n/auth';

/** "──── or ────" between password sign-in and Google. */
export default function AuthDivider({ label = authCopy.common.or }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-muted" role="separator">
      <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
      {label}
      <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
    </div>
  );
}
