import { authCopy } from '../i18n/auth';
import { getApiErrorCode } from './apiErrors';
import { describeFieldDetail, getServerFieldErrors } from './serverFieldErrors';

// Turns auth API failures into farmer-friendly text. Contract endpoints send a
// machine-readable `code` (AUTH_API_CONTRACT §1.2); older ones only send a
// status and `error`, so those still fall back to status-based messages.

const { errors: copy } = authCopy;

const TECHNICAL_ERROR = /sql|database|constraint|integrity|traceback|exception|stack trace|foreign key|not null|unique key|relation .* does not exist|column .* does not exist|sqlalchemy|sqlite|psycopg/i;

function getSafeServerMessage(data) {
  const candidate = typeof data === 'string'
    ? data
    : data?.message ?? data?.error ?? data?.detail;
  const message = typeof candidate === 'string' ? candidate.trim() : '';

  if (!message || message.length > 240 || TECHNICAL_ERROR.test(message)) return null;
  return message;
}

function getRawFieldErrors(data) {
  const errors = data?.fields ?? data?.field_errors ?? data?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null;
  return errors;
}

function getFieldErrorSummary(data) {
  const errors = getRawFieldErrors(data);
  if (!errors) return null;

  const messages = Object.entries(errors)
    .slice(0, 4)
    .map(([field, detail]) => {
      const label = copy.fieldLabels[field] ?? field.replaceAll('_', ' ');
      return `${label}: ${describeFieldDetail(detail)}`;
    });

  return messages.length ? messages.join(' ') : null;
}

// Auth flows read the same envelope `code` as every other API call.
export const getAuthErrorCode = getApiErrorCode;

/** Seconds from the `Retry-After` header on a 429, or null. */
export function getRetryAfterSeconds(error) {
  if (error?.response?.status !== 429) return null;
  const headers = error.response.headers ?? {};
  const raw = typeof headers.get === 'function' ? headers.get('retry-after') : headers['retry-after'] ?? headers['Retry-After'];
  const seconds = Number.parseInt(raw, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Backend password rule ids from a WEAK_PASSWORD response. */
export function getPasswordViolationsFromError(error) {
  const violations = error?.response?.data?.violations;
  return getAuthErrorCode(error) === 'WEAK_PASSWORD' && Array.isArray(violations) ? violations : [];
}

// Codes that are about one input, so the message can sit next to that field.
const CODE_FIELDS = {
  INVALID_PHONE: 'phone_number',
  PHONE_IN_USE: 'phone_number',
  PHONE_REQUIRED: 'phone_number',
  EMAIL_IN_USE: 'email',
  WEAK_PASSWORD: 'password',
  PASSWORD_MISMATCH: 'confirm_password',
  INVALID_BOOTSTRAP_KEY: 'bootstrap_key',
};

/** `{ field: message }` for showing server validation next to each input (shared reader). */
export function getFieldErrorsFromError(error) {
  return getServerFieldErrors(error, {
    codeFields: CODE_FIELDS,
    codeMessage: (code) => {
      const violation = getPasswordViolationsFromError(error)[0];
      return (violation && authCopy.password.errors[violation]) ?? copy.codes[code];
    },
  });
}

function getStatusMessage(status, data, flow) {
  const flowCopy = copy.byFlow[flow] ?? copy.byFlow.default;

  if (flow === 'login' && [401, 403].includes(status)) return flowCopy.unauthorized;
  if (flow === 'bootstrap' && [401, 403].includes(status)) return flowCopy.unauthorized;
  if (flow === 'bootstrap' && [404, 409, 410].includes(status)) return flowCopy.unavailable;
  if (flow === 'register' && status === 409) return flowCopy.conflict;
  // The backend answers 404 when the demo is switched off (docs/demo-account.md).
  if (flow === 'demo' && status === 404) return flowCopy.unavailable;

  if ([400, 422].includes(status)) {
    return getFieldErrorSummary(data) ?? getSafeServerMessage(data) ?? copy.validation;
  }

  if (status >= 500) return flowCopy.server ?? copy.server;

  return getSafeServerMessage(data) ?? flowCopy.fallback ?? copy.byFlow.default.fallback;
}

export function getAuthErrorMessage(error, flow) {
  if (!error?.response) return copy.network;

  const { status, data } = error.response;

  if (status === 429) {
    const seconds = getRetryAfterSeconds(error);
    return seconds ? copy.rateLimitedFor(seconds) : copy.rateLimited;
  }

  const code = getAuthErrorCode(error);
  if (code === 'VALIDATION_ERROR') return getFieldErrorSummary(data) ?? copy.validation;
  if (code && copy.codes[code]) return copy.codes[code];

  return getStatusMessage(status, data, flow);
}

/**
 * Everything a form needs from a failed auth call, so screens don't each
 * re-parse the error.
 */
export function describeAuthError(error, flow) {
  return {
    message: getAuthErrorMessage(error, flow),
    code: getAuthErrorCode(error),
    retryAfter: getRetryAfterSeconds(error),
    fieldErrors: getFieldErrorsFromError(error),
    passwordViolations: getPasswordViolationsFromError(error),
  };
}
