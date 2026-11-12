import { getLocale } from '../i18n/locale';

// Date display for the whole app: day first, as Kenyan farmers write dates.
//   display  "03 Nov 2026"     group/day label "Tue 03 Nov"     input "03/11/2026"
// Month names are fixed here rather than taken from Intl, whose en-GB data differs
// between runtimes ("Sep" vs "Sept"), in each language the app has. Formatting only: no date maths.
const NAMES = {
  en: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  // Kiswahili short months as in CLDR. Weekday short forms are not standard; these are the
  // first letters of Jumapili … Jumamosi as commonly abbreviated. REVIEW
  sw: {
    months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
    weekdays: ['Jpi', 'Jtt', 'Jnn', 'Jtn', 'Alh', 'Iju', 'Jmo'],
  },
};
const names = () => NAMES[getLocale()] ?? NAMES.en;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (value) => String(value).padStart(2, '0');

// A calendar date (YYYY-MM-DD) is read as that local day, never UTC midnight.
function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = typeof value === 'string' ? CALENDAR_DATE.exec(value) : null;
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "03 Nov 2026"; `fallback` when there is no readable date. */
export function formatDate(value, fallback = '—') {
  const date = toDate(value);
  if (!date) return fallback;
  return `${pad(date.getDate())} ${names().months[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Tue 03 Nov", or "Tue 03 Nov 2026" with `withYear`. For day group headers. */
export function formatDayLabel(value, { withYear = false } = {}) {
  const date = toDate(value);
  if (!date) return null;
  const label = `${names().weekdays[date.getDay()]} ${pad(date.getDate())} ${names().months[date.getMonth()]}`;
  return withYear ? `${label} ${date.getFullYear()}` : label;
}

/** "03 Nov 2026 – 15 Nov 2026" for a chosen range. */
export function formatDateRange(from, to) {
  if (!from || !to) return null;
  return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
}

/** YYYY-MM-DD → "03/11/2026" for a dd/mm/yyyy input; '' when empty. */
export function toInputDate(iso) {
  const match = CALENDAR_DATE.exec(iso ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/**
 * "3/11/2026" or "03/11/2026" → "2026-11-03"; null unless it is a real calendar date.
 * Day first, always: the browser's US month-first order is never assumed.
 */
export function parseInputDate(text) {
  const match = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text ?? '');
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Keeps digits and inserts the slashes as the farmer types: "0311" → "03/11". */
export function maskInputDate(text) {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
