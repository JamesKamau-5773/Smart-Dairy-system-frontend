// Calendar dates as the farm sees them. `toISOString()` gives the UTC date,
// which in Nairobi (UTC+3) is still "yesterday" until 03:00, so a feeding or
// milking recorded early in the morning would land on the wrong day.

// toISOString() of the moment shifted by the device's offset reads as local time.
const asLocalIso = (now) => new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString();

// The farm's timezone from the backend (`/auth/me` → `farm_timezone`, one setting for
// the whole app). Until it's known, dates follow the device.
let farmTimeZone = null;
let farmDateFormat = null;

/** Called by the session when the backend reports the farm's IANA timezone. */
export function setFarmTimeZone(timeZone) {
  if (!timeZone || timeZone === farmTimeZone) return;
  try {
    // en-CA formats dates as YYYY-MM-DD.
    farmDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    farmTimeZone = timeZone;
  } catch {
    // Unknown zone name: keep following the device rather than guess.
  }
}

/** Today's farm calendar date as YYYY-MM-DD. */
export function todayLocalIso(now = new Date()) {
  return farmDateFormat ? farmDateFormat.format(now) : asLocalIso(now).slice(0, 10);
}

/**
 * A moment's clock time on the farm, "06:12" (24-hour), in the farm's timezone from the
 * backend (the device's until it is known); null when it can't be read.
 */
export function formatFarmTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(farmTimeZone ? { timeZone: farmTimeZone } : {}),
  }).format(date);
}

/**
 * Now as YYYY-MM-DDTHH:mm in the device's time, the value an <input type="datetime-local">
 * expects (the browser reads that input in the device's time, not the farm's).
 */
export function nowLocalDateTimeInput(now = new Date()) {
  return asLocalIso(now).slice(0, 16);
}

/**
 * The local calendar date of a moment, as YYYY-MM-DD; null when it can't be read.
 * A date that is already YYYY-MM-DD (as the backend sends calendar dates) is
 * returned unchanged: parsing it would treat it as UTC midnight and could shift it.
 */
export function toLocalIsoDate(value) {
  // new Date(null) is the 1970 epoch, not "no date".
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : todayLocalIso(date);
}

/**
 * An <input type="datetime-local"> value (device time) as an ISO date-time with the
 * offset the backend needs; null when empty or unreadable.
 */
export function dateTimeInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
