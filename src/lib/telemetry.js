/**
 * Telemetry / observability.
 *
 * No remote sink (Sentry/LogRocket) can be added in this environment (no network
 * for installs), so this provides a lightweight, dependency-free event buffer that:
 *   - captures contract violations, runtime errors, and unhandled promise rejections
 *   - buffers them in-memory (capped) and mirrors to console in dev
 *   - exposes `getTelemetryLog()` for inspection / a future uploader
 *
 * To go remote later, implement `flushTelemetry()` to POST the buffer to a
 * `/api/logs`-style endpoint (or swap the body for the Sentry SDK once installable).
 */

const MAX_EVENTS = 200;
const buffer = [];
const listeners = new Set();

function push(event) {
  const entry = {
    ts: new Date().toISOString(),
    ...event,
  };
  buffer.push(entry);
  if (buffer.length > MAX_EVENTS) {
    buffer.shift();
  }
  listeners.forEach((fn) => {
    try { fn(entry); } catch { /* listener errors must not break the app */ }
  });
  return entry;
}

/** Log a frontend/backend response-contract drift event. */
export function logContractViolation({ contract, issues = [] }) {
  return push({ type: 'contract_violation', contract, issues });
}

/** Log an application error with optional structured context. */
export function logError(message, context = {}) {
  return push({ type: 'error', message: String(message), context });
}

/**
 * The one place a caught error is reported. Records only what helps diagnose it (where it
 * happened, HTTP status, the backend's error code, the error message), never request
 * bodies, phone numbers, balances or tokens. Logs to the console in development only; a
 * remote sink can be attached later through `onTelemetryEvent` / `flushTelemetry`.
 *
 * @param {unknown} error The caught error (an axios error or any thrown value).
 * @param {{ where: string }} context `where` names the action, e.g. 'FastMilkLog.save'.
 * @returns {object} The buffered telemetry entry.
 *
 * @example
 * catch (error) { reportError(error, { where: 'FastMilkLog.delete' }); }
 */
export function reportError(error, { where } = {}) {
  const status = error?.response?.status ?? null;
  const code = typeof error?.response?.data?.code === 'string' ? error.response.data.code : null;
  const message = error instanceof Error ? error.message : String(error);
  const entry = push({ type: 'error', message, context: { where: where ?? 'unknown', status, code } });
  if (import.meta.env?.DEV) {
    console.error(`[${entry.context.where}]`, error);
  }
  return entry;
}

/** Log a domain event (e.g. batch created, delivery logged) for analytics/debug. */
export function logEvent(name, context = {}) {
  return push({ type: 'event', name, context });
}

/** Read a copy of the buffered events (newest last). */
export function getTelemetryLog() {
  return buffer.slice();
}

/** Subscribe to new events. Returns an unsubscribe function. */
export function onTelemetryEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Install global handlers so uncaught errors and unhandled promise rejections are
 * captured into the buffer (and still logged to console). Idempotent.
 */
let installed = false;
export function installGlobalErrorCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    push({
      type: 'uncaught_error',
      message: e.message,
      source: e.filename,
      line: e.lineno,
      col: e.colno,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    push({
      type: 'unhandled_rejection',
      message: e.reason?.message ?? String(e.reason),
      stack: e.reason?.stack?.slice(0, 500),
    });
  });
}

/** Placeholder for a future remote uploader. Safe no-op today. */
export async function flushTelemetry() {
  // Intentionally a no-op until a remote sink is configured. Returning the buffer
  // lets a future caller POST it without changing call sites.
  return getTelemetryLog();
}
