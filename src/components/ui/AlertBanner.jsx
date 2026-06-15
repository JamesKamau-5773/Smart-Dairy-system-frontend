import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle, RefreshCw, ArrowRight, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   VARIANT CONFIG
   Colours are ink weights, not generic UI hues. Each was chosen for how
   it reads against paper — heavy, specific, not "web safe".
───────────────────────────────────────────────────────────────────────── */
const VARIANTS = {
  danger: {
    bg:        'bg-[#fff5f5]     dark:bg-[#200a0a]',
    border:    'border-[#c41230] dark:border-[#e05555]',
    label:     'text-[#c41230]  dark:text-[#e05555]',
    tag:       'ERROR',
    Icon:      XCircle,
    role:      'alert',
    ariaLive:  'assertive',
    stripes:   true,
  },
  warning: {
    bg:        'bg-[#fffbf0]     dark:bg-[#1e1600]',
    border:    'border-[#b35c00] dark:border-[#d98c2e]',
    label:     'text-[#b35c00]  dark:text-[#d98c2e]',
    tag:       'WARN',
    Icon:      AlertTriangle,
    role:      'alert',
    ariaLive:  'polite',
    stripes:   false,
  },
  info: {
    bg:        'bg-[#f4f7fb]     dark:bg-[#080f1a]',
    border:    'border-[#1a3a5c] dark:border-[#4a7aac]',
    label:     'text-[#1a3a5c]  dark:text-[#4a7aac]',
    tag:       'INFO',
    Icon:      Info,
    role:      'status',
    ariaLive:  'polite',
    stripes:   false,
  },
  success: {
    bg:        'bg-[#f2faf6]     dark:bg-[#051209]',
    border:    'border-[#1a5c38] dark:border-[#3a9e65]',
    label:     'text-[#1a5c38]  dark:text-[#3a9e65]',
    tag:       'OK',
    Icon:      CheckCircle,
    role:      'status',
    ariaLive:  'polite',
    stripes:   false,
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   COUNTDOWN  — ticking seconds, not a progress bar
───────────────────────────────────────────────────────────────────────── */
function Countdown({ duration, onDone, labelClass }) {
  const [tick, setTick] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (tick <= 0) { onDone(); return; }
    const id = setTimeout(() => setTick(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tick, onDone]);

  return (
    <span
      className={`inline-flex items-center justify-center text-xs font-sans tabular-nums px-2 py-0.5 rounded bg-black/6 ${labelClass}`}
      aria-label={`Closes in ${tick} second${tick !== 1 ? 's' : ''}`}
    >
      {tick}s
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ALERT BANNER

   Props:
     type         'info' | 'success' | 'warning' | 'danger'
     title        string
     message      string | ReactNode
     details      string            — togglable extra text
     action       { label, onClick } | { label, href }
     onRetry      () => void
     onDismiss    () => void        — undefined = not dismissible
     onAutoDismiss () => void       — called when countdown expires
     autoDismiss  number            — ms; shows ticking countdown
     compact      boolean
     className    string
───────────────────────────────────────────────────────────────────────── */
export default function AlertBanner({
  type        = 'info',
  title,
  message,
  details,
  action,
  onRetry,
  onDismiss,
  onAutoDismiss,
  autoDismiss,
  compact     = false,
  className   = '',
}) {
  const v = VARIANTS[type] ?? VARIANTS.info;
  const { Icon } = v;

  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [open,    setOpen]    = useState(false);

  /* One-frame delay so entrance transition actually fires */
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const dismiss = useCallback((reason = 'manual') => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      if (reason === 'auto') {
        onAutoDismiss?.();
      } else {
        onDismiss?.();
      }
    }, 300);
  }, [closing, onAutoDismiss, onDismiss]);

  useEffect(() => {
    if (!onDismiss) return;
    const h = (e) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onDismiss, dismiss]);

  const pad = compact ? 'py-3 px-4' : 'py-4 px-5';

  const stateClasses = !mounted || closing
    ? 'opacity-0 -translate-y-2'
    : 'opacity-100 translate-y-0';

  return (
    <div
      role={v.role}
      aria-live={v.ariaLive}
      aria-atomic="true"
      className={[
        'relative overflow-hidden',
        /* Hard left accent edge — the only visual flourish */
        'border-l-[5px] border-y border-r',
        v.bg,
        v.border,
        'transition-all duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        stateClasses,
        className,
      ].join(' ')}
    >
      {/* ── Hazard-tape stripes on left edge (danger only) ───────────────
          Pure CSS — no image, no extra element needed beyond the pseudo
          strip. Layered over the left border so it bleeds through. */}
      {v.stripes && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[5px] pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              -45deg,
              #c41230 0px, #c41230 4px,
              #fff5f5 4px, #fff5f5 8px
            )`,
          }}
        />
      )}

      {/* ── Faint watermark — the kind of thing a human designer adds
          to make a component feel "printed" rather than "rendered" ─── */}
      <span
        aria-hidden="true"
        className={[
          'absolute right-4 top-1/2 -translate-y-1/2',
          'font-sans font-bold text-[56px] leading-none tracking-tight',
          'opacity-[0.02] select-none pointer-events-none hidden sm:block',
          v.label,
        ].join(' ')}
      >
        {v.tag}
      </span>

      {/* ── Main row ─────────────────────────────────────────────────── */}
      <div className={`relative flex items-start gap-3 ${pad}`}>

        {/* Icon — no badge box, just the raw icon */}
        <Icon
          size={compact ? 15 : 17}
          strokeWidth={2.2}
          className={`flex-shrink-0 mt-[3px] ${v.label}`}
          aria-hidden="true"
        />

        {/* Body */}
        <div className="flex-1 min-w-0">

          {/* Type tag + title on the same baseline */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
            <span className={`font-sans text-[10px] font-bold tracking-normal normal-case ${v.label}`}>
              {v.tag}
            </span>
            {title && (
              <span className="font-sans text-[13px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                — {title}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="font-sans text-sm leading-[1.65] text-slate-800 dark:text-slate-200">
            {message}
          </p>

          {/* Expandable details — accordion via max-height */}
          {details && (
            <div className="mt-2">
              <button
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="font-sans text-[11px] flex items-center gap-1 opacity-45 hover:opacity-80 transition-opacity duration-150 focus-visible:outline-none focus-visible:opacity-90 dark:text-slate-300"
              >
                <span
                  className="inline-block transition-transform duration-200 text-base leading-none"
                  style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  ›
                </span>
                {open ? 'less' : 'more info'}
              </button>
              <div
                className="overflow-hidden transition-all duration-[250ms] ease-in-out"
                style={{ maxHeight: open ? '200px' : '0px', opacity: open ? 1 : 0 }}
              >
                <p className="font-sans text-xs leading-relaxed text-slate-600 dark:text-slate-400 mt-2 border-l-2 border-current/20 pl-3">
                  {details}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {(action || onRetry) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3">
              {action && (
                action.href ? (
                  <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 font-sans text-xs font-bold underline underline-offset-2 decoration-1 hover:decoration-2 transition-all duration-100 ${v.label}`}
                  >
                    {action.label} <ArrowRight size={11} />
                  </a>
                ) : (
                  <button
                    onClick={action.onClick}
                    className={`inline-flex items-center gap-1 font-sans text-xs font-bold underline underline-offset-2 decoration-1 hover:decoration-2 transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current ${v.label}`}
                  >
                    {action.label} <ArrowRight size={11} />
                  </button>
                )
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 font-sans text-xs opacity-45 hover:opacity-80 transition-opacity duration-150 focus-visible:outline-none text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw size={10} />
                  retry
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss cluster */}
        {(onDismiss || autoDismiss) && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {autoDismiss && (
              <Countdown
                duration={autoDismiss}
                onDone={() => dismiss('auto')}
                labelClass={v.label}
              />
            )}
            {onDismiss && (
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className={`opacity-60 hover:opacity-90 active:scale-90 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:ring-offset-2 ${v.label}`}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}