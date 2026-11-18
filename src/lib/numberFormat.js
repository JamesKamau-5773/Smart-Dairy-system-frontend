// Display formatting for quantities. Formatting only: values are never summed,
// averaged or rounded here. Decimal strings from the backend ("1306.4") keep their
// digits exactly; only thousands separators are added.

const DECIMAL_STRING = /^(-?)(\d+)(?:\.(\d+))?$/;
const groupDigits = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** "1306.4" → "1,306.4". Numbers are shown with `fractionDigits` decimals. Null when unreadable. */
export function formatDecimal(value, { fractionDigits = 1 } = {}) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value).replace(/^-/, '−');
  }
  const match = DECIMAL_STRING.exec(String(value).trim());
  if (!match) return null;
  const [, sign, integer, fraction] = match;
  return `${sign ? '−' : ''}${groupDigits(integer)}${fraction ? `.${fraction}` : ''}`;
}

/**
 * One precision for litres everywhere: 1 dp ("8.0 L", "1,306.4 L"). A backend string
 * that already has 1 dp keeps its digits; anything else is displayed at 1 dp.
 * "—" only when there is no value at all.
 */
export function toLitresText(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (/^-?\d+\.\d$/.test(text)) return formatDecimal(text);
  if (/^-?\d+$/.test(text)) return formatDecimal(`${text}.0`);
  const number = typeof value === 'number' ? value : Number(text);
  return formatDecimal(Number.isFinite(number) ? number : null, { fractionDigits: 1 });
}

/** Litres for display, e.g. "1,306.4 L"; "—" when unknown. */
export function formatLitres(value, { unit = true } = {}) {
  const formatted = toLitresText(value);
  if (formatted === null) return '—';
  return unit ? `${formatted} L` : formatted;
}

/** A signed litres difference the backend sent: "+0.4 L", "−2.1 L", "0.0 L"; "—" when unknown. */
export function formatSignedLitres(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const sign = number > 0 ? '+' : number < 0 ? '−' : '';
  return `${sign}${formatLitres(Math.abs(number))}`;
}

/** Whole counts with separators; "—" when unknown. */
export function formatCount(value) {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value).trim();
  return /^\d+$/.test(text) ? groupDigits(text) : '—';
}

/**
 * Money for display, e.g. "KES 12,400", "−KES 800" (a true minus before the currency);
 * "—" when unknown. Whole shillings by default; pass `fractionDigits: 2` for per-litre
 * figures. `currency` is the code the backend sent, when it sent one.
 */
export function formatKES(value, { fractionDigits = 0, currency = 'KES' } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const amount = formatDecimal(Math.abs(number), { fractionDigits });
  // No minus on an amount that shows as zero ("−KES 0").
  const negative = number < 0 && /[1-9]/.test(amount);
  return `${negative ? '−' : ''}${currency} ${amount}`;
}

/** "-5.3" → "5.3%" (the sign is shown separately by the change indicator). */
export function formatPercentMagnitude(value) {
  const formatted = formatDecimal(value);
  if (formatted === null) return null;
  return `${formatted.replace(/^−/, '')}%`;
}

/** "As of 21:04" time for cached data. */
export function formatAsOfTime(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}
