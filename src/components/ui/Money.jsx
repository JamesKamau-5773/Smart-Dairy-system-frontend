/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { cn } from '../../lib/utils';

/* ─── Currency metadata ─────────────────────────────────────────────────── */
const CURRENCY_META = {
  KES: { locale: 'en-KE', symbol: 'KES', decimals: 2 },
  USD: { locale: 'en-US', symbol: '$',   decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€',   decimals: 2 },
  GBP: { locale: 'en-GB', symbol: '£',   decimals: 2 },
  UGX: { locale: 'en-UG', symbol: 'USh', decimals: 0 },
  TZS: { locale: 'sw-TZ', symbol: 'TSh', decimals: 0 },
  NGN: { locale: 'en-NG', symbol: '₦',   decimals: 2 },
  ZAR: { locale: 'en-ZA', symbol: 'R',   decimals: 2 },
  GHS: { locale: 'en-GH', symbol: 'GH₵', decimals: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥',   decimals: 0 },
  INR: { locale: 'en-IN', symbol: '₹',   decimals: 2 },
};

const DEFAULT_META = { locale: 'en-US', symbol: '', decimals: 2 };

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

/** Plain-text money for aria-labels and titles, e.g. "−KES 800.00". */
export function formatMoneyText(amount, currency = 'KES') {
  if (amount == null || isNaN(amount)) return '—';
  const meta = CURRENCY_META[currency] ?? { ...DEFAULT_META, symbol: currency };
  return `${amount < 0 ? '−' : ''}${meta.symbol || currency} ${formatValue(Math.abs(amount), currency)}`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
/**
 * Money
 *
 * Props:
 *  amount        number | null | undefined  — value to display
 *  currency      string                     — ISO-4217 code (default 'KES')
 *  showSign      boolean                    — always show +/- sign
 *  tone          'net'                      — signed figure: money-positive / money-negative
 *                                              token, true minus (U+2212), no plus sign
 *                'signed'                   — as 'net', but only negatives are coloured
 *  showCurrency  boolean                    — show the currency symbol (default true); hide it
 *                                              where a column header already names the unit
 *  colored       boolean                    — legacy alias of tone="net"
 *  animate       boolean                    — bounce animation on value change
 *  compact       boolean                    — abbreviate large numbers (1.2M, 45K)
 *  blurred       boolean                    — privacy mask (toggle with click)
 *  cents         'muted' | 'plain'          — 'muted' (default) fades the decimals; 'plain'
 *                                              shows them like the whole number (same colour)
 *  size          'body'|'stat-value'        — type role (default 'body'); the symbol and
 *                                              decimals share it. Pass text-body-strong in
 *                                              className for a bold body figure.
 *  className     string
 */
export default function Money({
  amount,
  currency  = 'KES',
  showSign  = false,
  colored   = false,
  tone      = null,
  showCurrency = true,
  animate   = false,
  compact   = false,
  blurred   = false,
  size      = 'body',
  cents     = 'muted',
  className = '',
}) {
  const [hidden, setHidden] = useState(blurred);

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

  /* ── Type role ──────────────────────────────────────────────────────── */
  // The older preset names (xs–xl) still map onto the two roles until every caller moves.
  const role = size === 'stat-value' || size === 'lg' || size === 'xl' ? 'text-stat-value' : 'text-body';

  /* ── Color classes ──────────────────────────────────────────────────── */
  // The sign is always shown with the colour, so colour is never the only signal.
  const isSigned = tone === 'signed';
  const isNet = tone === 'net' || colored || isSigned;
  const colorClass = !isNet || !isValid
    ? ''
    : isNeg ? 'text-money-negative'
    : isPos && !isSigned ? 'text-money-positive'
    : '';

  /* ── Sign prefix ────────────────────────────────────────────────────── */
  // A true minus (U+2212) directly before the currency; a net figure never gets a plus.
  const sign = !isValid ? '' : isNeg ? '−' : showSign && !isNet ? '+' : '';

  /* ── Blur / privacy mask ────────────────────────────────────────────── */
  const privacyClass = hidden ? 'blur-sm select-none pointer-events-none' : '';

  return (
    <span
      title={hidden ? 'Click to reveal' : formatMoneyText(amount, currency)}
      onClick={blurred ? () => setHidden(h => !h) : undefined}
      className={cn(
        'inline-flex items-baseline gap-0.5 tabular-nums',
        'transition-all duration-200',
        role,
        colorClass,
        blurred && 'cursor-pointer',
        animate && 'transition-colors',
        className,
      )}
    >
      {/* Sign */}
      {sign && (
        <span className="-mr-0.5">
          <span aria-hidden="true">{sign}</span>
          <span className="sr-only">{isNeg ? 'minus ' : 'plus '}</span>
        </span>
      )}

      {/* Currency symbol */}
      {showCurrency && (
        <span
          className="mr-0.5 opacity-70"
          aria-label={currency}
        >
          {meta.symbol || currency}
        </span>
      )}

      {/* Amount — blurred content */}
      <span className={privacyClass}>
        {/* Integer part */}
        <span>{integer}</span>

        {/* Decimal part: same size; faded unless `cents="plain"` */}
        {decimal && (
          <span className={cents === 'plain' ? undefined : 'opacity-60'}>{decimal}</span>
        )}
      </span>

      {/* Compact suffix */}
      {compact && compactFormatted && (
        <span className="ml-0.5 opacity-60" aria-hidden="true" />
      )}
    </span>
  );
}
