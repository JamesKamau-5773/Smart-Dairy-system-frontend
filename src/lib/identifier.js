import { looksLikePhone, normalizeKenyanPhone } from './phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim());
}

/** Classifies what was typed into the "Phone or email" field. */
export function classifyIdentifier(value) {
  const text = String(value ?? '').trim();
  if (!text) return { type: 'empty', value: '' };
  if (isEmail(text)) return { type: 'email', value: text.toLowerCase() };
  if (looksLikePhone(text)) return { type: 'phone', value: normalizeKenyanPhone(text) || text.replace(/[^\d+]/g, '') };
  return { type: 'username', value: text };
}

/**
 * Login request body. `login` is the contract field (AUTH_API_CONTRACT §4);
 * `username` is kept so the request also works against the backend that predates it.
 */
export function toLoginPayload(identifier, password) {
  const { value } = classifyIdentifier(identifier);
  return { login: value, username: value, password: password ?? '' };
}
