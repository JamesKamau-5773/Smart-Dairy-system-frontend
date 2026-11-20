// What the profile page shows for a failed save, from the backend's answer (codes and
// `fields`). Each message sits under its field; `general` is for everything else.
import { accountCopy } from '../i18n/account';
import { authCopy } from '../i18n/auth';
import { getApiErrorBody, getApiErrorCode, isDemoRefusal } from './apiErrors';
import { getPasswordViolationsFromError, getRetryAfterSeconds } from './authErrorMessages';
import { describeFieldDetail } from './serverFieldErrors';
import { normalizeKenyanPhone } from './phone';

const PROFILE_FIELDS = ['name', 'phone_number', 'email', 'farm_location'];

const isOffline = (error) => !error?.response;

function generalMessage(error, fallback) {
  if (isDemoRefusal(error)) return null; // the app-wide sign-up prompt covers it
  if (isOffline(error)) return authCopy.errors.network;
  if (error.response.status === 429) {
    const seconds = getRetryAfterSeconds(error);
    return seconds ? authCopy.errors.rateLimitedFor(seconds) : authCopy.errors.rateLimited;
  }
  return fallback;
}

/**
 * PATCH /auth/me failures: `{ fields: { name, farm_location, phone_number, email }, general }`.
 * PHONE_IN_USE / INVALID_PHONE and EMAIL_IN_USE belong to their field; `too_long` gets the limit.
 */
export function describeProfileError(error) {
  const copy = accountCopy.details.errors;
  const code = getApiErrorCode(error);
  const fields = {};
  if (code === 'PHONE_IN_USE' || code === 'INVALID_PHONE') fields.phone_number = copy[code];
  if (code === 'EMAIL_IN_USE') fields.email = copy[code];
  Object.entries(getApiErrorBody(error).fields ?? {}).forEach(([field, reason]) => {
    if (fields[field]) return;
    if (reason === 'too_long' && field === 'name') fields.name = copy.nameTooLong;
    else if (reason === 'too_long' && field === 'farm_location') fields.farm_location = copy.farmLocationTooLong;
    else fields[field] = describeFieldDetail(reason);
  });
  const general = Object.keys(fields).length ? null : generalMessage(error, accountCopy.details.saveFailed);
  return { fields, general };
}

/**
 * POST /auth/password failures: `{ fields: { current_password, new_password, confirm_password },
 * violations, general, resetRequired }`. `resetRequired` means the account must finish the forced
 * reset first (409 PASSWORD_RESET_REQUIRED); the page sends the person there.
 */
export function describePasswordError(error) {
  const copy = accountCopy.password.errors;
  const code = getApiErrorCode(error);
  const reasons = getApiErrorBody(error).fields ?? {};
  const fields = {};
  const violations = getPasswordViolationsFromError(error);

  if (code === 'PASSWORD_RESET_REQUIRED') return { fields, violations, general: null, resetRequired: true };
  if (code === 'INVALID_CURRENT_PASSWORD') fields.current_password = copy.currentInvalid;
  if (code === 'WEAK_PASSWORD') {
    fields.new_password = (violations[0] && authCopy.password.errors[violations[0]]) || copy.weak;
  }
  if (reasons.current_password === 'required') fields.current_password = copy.currentRequired;
  if (reasons.new_password === 'required') fields.new_password = copy.newRequired;
  if (reasons.new_password === 'unchanged') fields.new_password = copy.unchanged;
  if (reasons.confirm_password === 'mismatch') fields.confirm_password = copy.mismatch;

  const general = Object.keys(fields).length ? null : generalMessage(error, copy.failed);
  return { fields, violations, general, resetRequired: false };
}

// The same phone typed another way ("0712 345 678" for "+254712345678") is not a change.
const comparable = (field, value) => {
  const text = String(value ?? '').trim();
  return field === 'phone_number' && text ? (normalizeKenyanPhone(text) || text) : text;
};

/** Only the fields that changed, trimmed; an emptied phone or email is sent empty, which clears it. */
export function changedFields(form, profile) {
  return Object.fromEntries(PROFILE_FIELDS
    .map((field) => [field, String(form[field] ?? '').trim()])
    .filter(([field, value]) => comparable(field, value) !== comparable(field, profile?.[field])));
}
