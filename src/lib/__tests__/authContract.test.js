import { beforeEach, describe, expect, it } from 'vitest';
import { displayPhone, looksLikePhone, normalizeKenyanPhone } from '../phone';
import { classifyIdentifier, toLoginPayload } from '../identifier';
import { getPasswordStrength, getPasswordViolations } from '../passwordStrength';
import { AUTH_STATES, getAuthState, getGateRoute, getPhonePrompt, safeNextPath } from '../authState';
import { describeAuthError, getAuthErrorMessage, getRetryAfterSeconds } from '../authErrorMessages';
import { validateNewPassword, validateRegistration } from '../authValidation';
import { normalizeSessionUser } from '../backendApi';
import { clearSession, loadSession, saveSession } from '../sessionStore';
import { formatClock, secondsUntil } from '../countdown';

const apiError = (status, data = {}, headers = {}) => Object.assign(new Error('Request failed'), { response: { status, data, headers } });

describe('phone numbers', () => {
  it.each(['0712345678', '0112345678', '+254712345678', '254 712 345 678', '0712-345-678'])('accepts %s', (value) => {
    expect(normalizeKenyanPhone(value)).toMatch(/^254[17]\d{8}$/);
  });

  it.each(['12345', '0812345678', '+1 555 0100', ''])('rejects %s', (value) => {
    expect(normalizeKenyanPhone(value)).toBe('');
  });

  it('shows an E.164 number from the backend in the familiar spaced form', () => {
    expect(displayPhone('+254712345678')).toBe('+254 712 345 678');
  });

  it('tells phone-looking input apart from usernames', () => {
    expect(looksLikePhone('0712 345 678')).toBe(true);
    expect(looksLikePhone('kamau')).toBe(false);
  });
});

describe('the "Phone or email" field', () => {
  it.each([
    ['0712 345 678', { type: 'phone', value: '254712345678' }],
    ['+254712345678', { type: 'phone', value: '254712345678' }],
    [' Jane@Example.com ', { type: 'email', value: 'jane@example.com' }],
    ['kamau', { type: 'username', value: 'kamau' }],
  ])('classifies %s', (input, expected) => {
    expect(classifyIdentifier(input)).toEqual(expected);
  });

  it('sends `login` and keeps `username` for the backend that predates the contract', () => {
    expect(toLoginPayload('0712345678', 'pw')).toEqual({ login: '254712345678', username: '254712345678', password: 'pw' });
  });
});

describe('password policy (contract §1.4)', () => {
  it('reports each broken rule by its backend id', () => {
    expect(getPasswordViolations('short')).toEqual(['min_length', 'letter_and_digit']);
    expect(getPasswordViolations('abcdefgh')).toEqual(['letter_and_digit']);
    expect(getPasswordViolations('Maziwa2026')).toEqual([]);
  });

  it('rejects passwords containing the farmer’s phone number or email name', () => {
    expect(getPasswordViolations('a0712345678', { phone: '254712345678' })).toContain('not_personal');
    expect(getPasswordViolations('janekamau1', { email: 'janekamau@example.com' })).toContain('not_personal');
  });

  it('rates strength for the meter', () => {
    expect(getPasswordStrength('')).toBe('empty');
    expect(getPasswordStrength('abcdefgh')).toBe('weak');
    expect(getPasswordStrength('maziwa2026')).toBe('fair');
    expect(getPasswordStrength('Maziwa2026!')).toBe('strong');
  });

  it('blocks a weak or mismatched new password before it is sent', () => {
    expect(validateNewPassword({ password: 'short', confirm_password: 'short' }).password).toBe('Use at least 8 characters.');
    expect(validateNewPassword({ password: 'Maziwa2026', confirm_password: 'Maziwa2027' }).confirm_password).toBe('The passwords don’t match.');
    expect(validateNewPassword({ password: 'Maziwa2026', confirm_password: 'Maziwa2026' })).toEqual({});
  });

  it('treats email as optional on registration', () => {
    const form = { farm_name: 'Bahati', full_name: '', phone_number: '0712345678', email: '', password: 'Maziwa2026', bootstrap_key: '' };
    expect(validateRegistration(form)).toEqual({});
    expect(validateRegistration({ ...form, email: 'nope' }).email).toMatch(/valid email/);
  });
});

describe('auth_state routing (contract §2)', () => {
  it('treats a session without auth_state as active', () => {
    expect(getAuthState({ id: 1 })).toBe(AUTH_STATES.ACTIVE);
    expect(getGateRoute({ id: 1 })).toBeNull();
  });

  it('sends each blocking state to its screen', () => {
    expect(getGateRoute({ auth_state: 'PHONE_VERIFICATION_REQUIRED' })).toBe('/verify-phone');
    expect(getGateRoute({ auth_state: 'PASSWORD_RESET_REQUIRED' })).toBe('/reset-required-password');
  });

  it('lets a required password reset win over phone verification', () => {
    expect(getGateRoute({ auth_state: 'PHONE_VERIFICATION_REQUIRED', requires_password_reset: true })).toBe('/reset-required-password');
  });

  it('nudges about the phone only when the backend sends account flags', () => {
    expect(getPhonePrompt({ phone_number: null })).toBeNull();
    expect(getPhonePrompt({ phone_number: null, account_flags: { needs_phone: true } })).toBe('add');
    expect(getPhonePrompt({ phone_number: '+254712345678', account_flags: { phone_verified: false } })).toBe('verify');
    expect(getPhonePrompt({ phone_number: '+254712345678', account_flags: { phone_verified: true } })).toBeNull();
  });

  it.each([
    ['/dashboard', '/dashboard'],
    ['https://evil.example', '/app'],
    ['//evil.example', '/app'],
    ['/\\evil.example', '/app'],
    [null, '/app'],
  ])('only follows in-app redirects: %s', (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

describe('auth error messages (contract §1.2)', () => {
  it('switches on the machine-readable code, not the server text', () => {
    expect(getAuthErrorMessage(apiError(409, { code: 'PHONE_IN_USE', error: 'dup key' }), 'register')).toMatch(/already uses this phone number/);
    expect(getAuthErrorMessage(apiError(401, { code: 'INVALID_CREDENTIALS' }), 'login')).toMatch(/don’t match/);
  });

  it('falls back to status handling for endpoints without a code', () => {
    expect(getAuthErrorMessage(apiError(401, { error: 'Bad creds' }), 'login')).toMatch(/don’t match/);
    expect(getAuthErrorMessage(apiError(503), 'login')).toBe('We couldn’t sign you in right now. Please try again shortly.');
  });

  it('explains a dropped connection', () => {
    expect(getAuthErrorMessage(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }), 'login')).toMatch(/internet connection/);
  });

  it('reads Retry-After on a 429', () => {
    const error = apiError(429, { code: 'RATE_LIMITED' }, { 'retry-after': '42' });
    expect(getRetryAfterSeconds(error)).toBe(42);
    expect(getAuthErrorMessage(error)).toBe('Too many attempts. Try again in 42 seconds.');
  });

  it('maps field-specific codes and weak-password rules onto their fields', () => {
    const weak = describeAuthError(apiError(400, { code: 'WEAK_PASSWORD', violations: ['not_common'] }), 'register');
    expect(weak.passwordViolations).toEqual(['not_common']);
    expect(weak.fieldErrors.password).toBe('That password is too common. Choose another one.');

    expect(describeAuthError(apiError(409, { code: 'EMAIL_IN_USE' })).fieldErrors.email).toMatch(/already uses this email/);
  });

  it('never shows technical server details', () => {
    expect(getAuthErrorMessage(apiError(400, { error: 'IntegrityError: duplicate key' }), 'register')).not.toMatch(/Integrity/);
  });
});

describe('cookie-only sessions (Google sign-in)', () => {
  const meResponse = { id: 7, name: 'Jane', role: 'FARMER', tenant_id: 'tenant_1', farm_id: 'farm_1' };

  beforeEach(async () => {
    await clearSession();
    sessionStorage.clear();
  });

  it('accepts a tokenless /me response that names a user when asked to', () => {
    expect(normalizeSessionUser(meResponse, { allowCookieSession: true })).toMatchObject({ id: 7, token: null, cookie_session: true });
  });

  it('still rejects a tokenless response by default, or one without a user', () => {
    expect(() => normalizeSessionUser(meResponse)).toThrow('missing an access token');
    // The public /auth/status fallback answers 200 with no user; it must never become a session.
    expect(() => normalizeSessionUser({ status: 'Auth Blueprint is active.' }, { allowCookieSession: true })).toThrow();
  });

  it('saves and restores a cookie session', async () => {
    await saveSession(normalizeSessionUser(meResponse, { allowCookieSession: true }));
    expect(await loadSession()).toMatchObject({ id: 7, cookie_session: true });
    // Re-normalising a stored cookie session (app restart) keeps it valid.
    expect(normalizeSessionUser(await loadSession())).toMatchObject({ cookie_session: true });
  });
});

describe('countdowns', () => {
  it('formats the remaining time as m:ss', () => {
    expect(formatClock(582)).toBe('9:42');
    expect(formatClock(5)).toBe('0:05');
  });

  it('never goes below zero', () => {
    expect(secondsUntil(Date.now() - 1000)).toBe(0);
    expect(secondsUntil('not a date')).toBe(0);
  });
});
