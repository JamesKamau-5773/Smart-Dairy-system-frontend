import React, { useRef, useEffect, useState } from 'react';

/* ─── Currency metadata ─────────────────────────────────────────────────── */
const CURRENCY_META = {
  KES: { locale: 'en-KE', symbol: 'KSh', decimals: 2, flag: '🇰🇪' },
  USD: { locale: 'en-US', symbol: '$',   decimals: 2, flag: '🇺🇸' },
  EUR: { locale: 'de-DE', symbol: '€',   decimals: 2, flag: '🇪🇺' },
  GBP: { locale: 'en-GB', symbol: '£',   decimals: 2, flag: '🇬🇧' },
  UGX: { locale: 'en-UG', symbol: 'USh', decimals: 0, flag: '🇺🇬' },
  TZS: { locale: 'sw-TZ', symbol: 'TSh', decimals: 0, flag: '🇹🇿' },
  NGN: { locale: 'en-NG', symbol: '₦',   decimals: 2, flag: '🇳🇬' },
  ZAR: { locale: 'en-ZA', symbol: 'R',   decimals: 2, flag: '🇿🇦' },
  GHS: { locale: 'en-GH', symbol: 'GH₵', decimals: 2, flag: '🇬🇭' },
  JPY: { locale: 'ja-JP', symbol: '¥',   decimals: 0, flag: '🇯🇵' },
  INR: { locale: 'en-IN', symbol: '₹',   decimals: 2, flag: '🇮🇳' },
};

const DEFAULT_META = { locale: 'en-US', symbol: '', decimals: 2 };

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function usePrevious(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

function splitAmount(formatted) {
  // Split "1,234.56" into integer part "1,234" and decimal part ".56"
  const dotIdx = formatted.lastIndexOf('.');
  if (dotIdx === -1) return { integer: formatted, decimal: '' };
  return {
    integer: formatted.slice(0, dotIdx),
    decimal: formatted.slice(dotIdx),       // includes the dot
  };
}

function formatValue(amount, currency) {
  if (amount == null || isNaN(amount)) return null;
  const meta = CURRENCY_META[currency] ?? DEFAULT_META;
  return new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(amount);
}

/* ─── Component ──────────────────────────────────────────────────────────── */
/**
 * Money
 *
 * Props:
 *  amount        number | null | undefined  — value to display
 *  currency      string                     — ISO-4217 code (default 'KES')
 *  showFlag      boolean                    — prefix country flag emoji
 *  showSign      boolean                    — always show +/- sign
 *  colored       boolean                    — green/red for positive/negative
 *  animate       boolean                    — bounce animation on value change
 *  compact       boolean                    — abbreviate large numbers (1.2M, 45K)
 *  blurred       boolean                    — privacy mask (toggle with click)
 *  size          'xs'|'sm'|'md'|'lg'|'xl'  — preset text size
 *  className     string
 */
export default function Money({
  amount,
  currency  = 'KES',
  showFlag  = false,
  showSign  = false,
  colored   = false,
  animate   = false,
  compact   = false,
  blurred   = false,
  size      = 'md',
  className = '',
}) {
  const prev           = usePrevious(amount);
  const [bump, setBump] = useState(false);
  const [hidden, setHidden] = useState(blurred);

  /* Trigger bump animation whenever amount changes */
  useEffect(() => {
    if (!animate || prev === amount) return;
    setBump(true);
    const id = setTimeout(() => setBump(false), 350);
    return () => clearTimeout(id);
  }, [amount, animate, prev]);

  /* ── Derived values ─────────────────────────────────────────────────── */
  const isValid   = amount != null && !isNaN(amount);
  const isNeg     = isValid && amount < 0;
  const isPos     = isValid && amount > 0;
  const absAmount = isValid ? Math.abs(amount) : 0;

  const meta = CURRENCY_META[currency] ?? { ...DEFAULT_META, symbol: currency };

  /* Compact abbreviation */
  const compactFormatted = (() => {
    if (!isValid || !compact) return null;
    const abs = absAmount;
    if (abs >= 1_000_000_000) return (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (abs >= 1_000_000)     return (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 1_000)         return (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return null; // below 1 K → use normal format
  })();

  const formatted  = compactFormatted ?? formatValue(absAmount, currency);
  const { integer, decimal } = formatted ? splitAmount(formatted) : { integer: '—', decimal: '' };

  /* ── Size scale ─────────────────────────────────────────────────────── */
  const sizes = {
    xs: { wrap: 'text-xs',  symbol: 'text-[9px]',  decimal: 'text-[10px]' },
    sm: { wrap: 'text-sm',  symbol: 'text-[10px]', decimal: 'text-xs'     },
    md: { wrap: 'text-base',symbol: 'text-xs',     decimal: 'text-sm'     },
    lg: { wrap: 'text-xl',  symbol: 'text-sm',     decimal: 'text-base'   },
    xl: { wrap: 'text-3xl', symbol: 'text-base',   decimal: 'text-xl'     },
  };
  const sz = sizes[size] ?? sizes.md;

  /* ── Color classes ──────────────────────────────────────────────────── */
  const colorClass = !colored || !isValid
    ? ''
    : isNeg ? 'text-red-500 dark:text-red-400'
    : isPos ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-inherit';

  /* ── Sign prefix ────────────────────────────────────────────────────── */
  const sign = !isValid ? '' : isNeg ? '−' : showSign ? '+' : '';

  /* ── Blur / privacy mask ────────────────────────────────────────────── */
  const privacyClass = hidden ? 'blur-sm select-none pointer-events-none' : '';

  return (
    <span
      title={hidden ? 'Click to reveal' : `${currency} ${amount}`}
      onClick={blurred ? () => setHidden(h => !h) : undefined}
      className={[
        'inline-flex items-baseline gap-0.5 font-sans tabular-nums tracking-tight',
        'transition-all duration-200',
        sz.wrap,
        colorClass,
        blurred ? 'cursor-pointer' : '',
        bump ? 'scale-105' : 'scale-100',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Flag */}
      {showFlag && meta.flag && (
        <span className="not-italic mr-0.5 text-[1em]" aria-hidden="true">
          {meta.flag}
        </span>
      )}

      {/* Sign */}
      {sign && (
        <span className={`${sz.symbol} font-semibold leading-none self-center`} aria-hidden="true">
          {sign}
        </span>
      )}

      {/* Currency symbol */}
      <span
        className={`${sz.symbol} font-semibold opacity-70 leading-none self-center mr-0.5`}
        aria-label={currency}
      >
        {meta.symbol || currency}
      </span>

      {/* Amount — blurred content */}
      <span className={privacyClass}>
        {/* Integer part */}
        <span>{integer}</span>

        {/* Decimal part — visually de-emphasised */}
        {decimal && (
          <span className={`${sz.decimal} opacity-60`}>{decimal}</span>
        )}
      </span>

      {/* Compact suffix */}
      {compact && compactFormatted && (
        <span className={`${sz.symbol} opacity-60 ml-0.5`} aria-hidden="true" />
      )}
    </span>
  );
}