// Mirrors the backend password policy (AUTH_API_CONTRACT §1.4) so farmers see
// problems while typing. `not_common` needs the server's blocklist, so it is
// only reported back by the API as a WEAK_PASSWORD violation.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Rules the device can check, in the order they are shown. */
export const LOCAL_PASSWORD_RULES = ['min_length', 'letter_and_digit', 'not_personal'];

function personalFragments({ phone, email, username } = {}) {
  const phoneDigits = String(phone ?? '').replace(/\D/g, '');
  return [
    phoneDigits,
    phoneDigits.startsWith('254') ? `0${phoneDigits.slice(3)}` : '',
    phoneDigits.slice(-9),
    String(email ?? '').split('@')[0],
    String(username ?? ''),
  ]
    .map((fragment) => fragment.trim().toLowerCase())
    .filter((fragment) => fragment.length >= 4);
}

/** Returns the backend rule ids this password breaks. */
export function getPasswordViolations(password, personal) {
  const value = String(password ?? '');
  const lower = value.toLowerCase();
  const violations = [];

  if (value.length < PASSWORD_MIN_LENGTH) violations.push('min_length');
  if (value.length > PASSWORD_MAX_LENGTH) violations.push('max_length');
  if (!/[a-z]/i.test(value) || !/\d/.test(value)) violations.push('letter_and_digit');
  if (personalFragments(personal).some((fragment) => lower.includes(fragment))) violations.push('not_personal');

  return violations;
}

/** 'empty' | 'weak' | 'fair' | 'strong' — a meter for the farmer, not a gate. */
export function getPasswordStrength(password, personal) {
  const value = String(password ?? '');
  if (!value) return 'empty';
  if (getPasswordViolations(value, personal).length) return 'weak';

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-z\d]/i].filter((pattern) => pattern.test(value)).length;
  return value.length >= 12 || classes >= 3 ? 'strong' : 'fair';
}
