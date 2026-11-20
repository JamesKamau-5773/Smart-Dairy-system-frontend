// Routing decisions driven by the backend's `auth_state` and `account_flags`
// (AUTH_API_CONTRACT §2). Sessions from a backend that predates the contract
// have neither, so they fall back to the legacy `requires_password_reset` flag.

export const AUTH_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',
  PHONE_VERIFICATION_REQUIRED: 'PHONE_VERIFICATION_REQUIRED',
});

// Where each blocking state must be completed. A new state only needs an entry here.
const GATE_ROUTES = Object.freeze({
  [AUTH_STATES.PASSWORD_RESET_REQUIRED]: '/reset-required-password',
  [AUTH_STATES.PHONE_VERIFICATION_REQUIRED]: '/verify-phone',
});

export function getAuthState(user) {
  if (!user) return null;
  // Highest precedence first (contract §2.1): a required password reset wins over everything.
  if (user.requires_password_reset || user.auth_state === AUTH_STATES.PASSWORD_RESET_REQUIRED) {
    return AUTH_STATES.PASSWORD_RESET_REQUIRED;
  }
  return Object.values(AUTH_STATES).includes(user.auth_state) ? user.auth_state : AUTH_STATES.ACTIVE;
}

/** The screen a signed-in user must finish before entering the app, or null. */
export function getGateRoute(user) {
  return GATE_ROUTES[getAuthState(user)] ?? null;
}

const DEFAULT_FLAGS = Object.freeze({
  needs_phone: false,
  phone_verified: null,
  email_verified: null,
  has_password: true,
  linked_providers: [],
});

export function getAccountFlags(user) {
  return { ...DEFAULT_FLAGS, ...(user?.account_flags ?? {}) };
}

/**
 * 'add' | 'verify' | null — whether to nudge an otherwise active user about
 * their phone. Missing flags (older backend) never trigger the nudge.
 */
export function getPhonePrompt(user) {
  if (!user?.account_flags) return null;
  const flags = getAccountFlags(user);
  if (flags.needs_phone || !user.phone_number) return 'add';
  if (flags.phone_verified === false) return 'verify';
  return null;
}

/** Keeps redirects inside the app: only same-origin paths like "/dashboard". */
export function safeNextPath(value, fallback = '/app') {
  const path = String(value ?? '');
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : fallback;
}
