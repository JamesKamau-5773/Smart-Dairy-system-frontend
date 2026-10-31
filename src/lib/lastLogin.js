// Remembers the last sign-in identifier (username or phone, never the password)
// on this device so returning farmers only need to type their password.
const STORAGE_KEY = 'maziwa_last_login';

export function getLastLogin() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function rememberLogin(identifier) {
  const value = String(identifier ?? '').trim();
  if (!value) return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage blocked: the farmer types their phone number next time.
  }
}

export function forgetLogin() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

/** "0712345678" -> "0712 ••• 678". Usernames are shown as typed. */
export function maskIdentifier(identifier) {
  const value = String(identifier ?? '').trim();
  const digits = value.replace(/\D/g, '');
  const isPhone = digits.length >= 9 && /^[+\d\s-]+$/.test(value);
  if (!isPhone) return value;
  return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
}
