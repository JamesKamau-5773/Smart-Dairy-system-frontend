import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle2, X } from 'lucide-react';
import { INVERSE, tone } from './tones';
import { commonCopy } from '../../i18n/common';
import { useDrawAttention } from '../../hooks/useDrawAttention';

// Tones come from the app's palette (./tones): brand blue and ink, with the
// strength of the blue and the icon carrying the type.
const VARIANT_TONE = { danger: 'critical', warning: 'attention', info: 'info', success: 'info' };
const VARIANTS = {
  danger: { Icon: XCircle, role: 'alert', ariaLive: 'assertive' },
  warning: { Icon: AlertTriangle, role: 'alert', ariaLive: 'polite' },
  info: { Icon: Info, role: 'status', ariaLive: 'polite' },
  success: { Icon: CheckCircle2, role: 'status', ariaLive: 'polite' },
};

const linkBase = 'inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30';

/** Ticking seconds until an auto-dismissing banner closes. */
function Countdown({ duration, onDone }) {
  const [tick, setTick] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (tick <= 0) { onDone(); return undefined; }
    const id = setTimeout(() => setTick((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tick, onDone]);

  return (
    <span
      className="rounded-badge bg-ink-100 px-1.5 py-0.5 text-xs tabular-nums text-ink-muted"
      aria-label={`Closes in ${tick} second${tick !== 1 ? 's' : ''}`}
    >
      {tick}s
    </span>
  );
}

/**
 * Page-level message: type, optional title, message, optional details, one
 * action and/or retry, and dismissal (manual, Escape, or timed).
 *
 * Props: type 'info' | 'success' | 'warning' | 'danger'; title; message;
 * details; action { label, onClick } | { label, href }; onRetry; onDismiss;
 * onAutoDismiss; autoDismiss (ms); compact; className.
 */
export default function AlertBanner({
  type = 'info',
  title,
  message,
  details,
  action,
  onRetry,
  onDismiss,
  onAutoDismiss,
  autoDismiss,
  compact = false,
  className = '',
}) {
  const v = VARIANTS[type] ?? VARIANTS.info;
  const t = tone(VARIANT_TONE[type] ?? 'info');
  const { Icon } = v;
  // Errors are the one inverted block on the page; everything else stays light.
  const isError = type === 'danger';
  const look = isError
    ? { panel: INVERSE.panel, chip: INVERSE.chip, icon: INVERSE.icon, title: INVERSE.title, message: INVERSE.message, link: INVERSE.link, control: INVERSE.control }
    : { panel: `bg-card ${t.border}`, chip: t.surface, icon: t.icon, title: 'text-ink', message: title ? 'text-ink-muted' : 'text-ink', link: 'text-brand hover:text-brand-dark', control: 'text-ink-muted hover:bg-ink-100 hover:text-ink' };
  const linkClass = `${linkBase} ${look.link}`;
  const ref = useRef(null);
  useDrawAttention(ref, isError);
  // Errors stay until dismissed or fixed; only other messages may time out.
  const timed = isError ? undefined : autoDismiss;

  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [open, setOpen] = useState(false);

  // One-frame delay so the entrance transition runs.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dismiss = useCallback((reason = 'manual') => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      if (reason === 'auto') onAutoDismiss?.();
      else onDismiss?.();
    }, 200);
  }, [closing, onAutoDismiss, onDismiss]);

  useEffect(() => {
    if (!onDismiss) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss, dismiss]);

  const visible = mounted && !closing;

  return (
    <div
      ref={ref}
      tabIndex={isError ? -1 : undefined}
      role={v.role}
      aria-live={v.ariaLive}
      aria-atomic="true"
      className={[
        'rounded-card border outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out',
        look.panel,
        visible ? 'translate-y-0 opacity-100' : 'motion-safe:-translate-y-1 opacity-0',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {compact ? (
          <Icon size={16} className={`mt-0.5 shrink-0 ${look.icon}`} aria-hidden="true" />
        ) : (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${look.chip}`} aria-hidden="true">
            <Icon size={16} className={look.icon} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          {title && <p className={`text-sm font-semibold ${look.title}`}>{title}</p>}
          {message && <p className={`text-sm leading-relaxed ${title ? 'mt-0.5' : ''} ${look.message}`}>{message}</p>}

          {details && (
            <div className="mt-2">
              <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="text-xs font-semibold text-ink-muted hover:text-ink">
                {open ? 'Hide details' : 'More details'}
              </button>
              {open && <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{details}</p>}
            </div>
          )}

          {(action || onRetry) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              {action && (action.href ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {action.label}
                </a>
              ) : (
                <button type="button" onClick={action.onClick} className={linkClass}>
                  {action.label}
                </button>
              ))}
              {onRetry && (
                <button type="button" onClick={onRetry} className={linkClass}>
                  {commonCopy.list.tryAgain}
                </button>
              )}
            </div>
          )}
        </div>

        {(onDismiss || timed) && (
          <div className="flex shrink-0 items-center gap-1">
            {timed && <Countdown duration={timed} onDone={() => dismiss('auto')} />}
            {onDismiss && (
              <button
                type="button"
                onClick={() => dismiss()}
                aria-label={commonCopy.ui.dismiss}
                className={`-m-1.5 flex h-9 w-9 items-center justify-center rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${look.control}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
