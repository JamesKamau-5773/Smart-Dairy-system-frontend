import { FARM_STAFF_ROLE_OPTIONS } from './staffOnboarding';
import { normalizeKenyanPhone } from './phone';

// Phone helpers moved to ./phone; re-exported so existing staff forms keep working.
export { formatKenyanPhoneInput, normalizeKenyanPhone } from './phone';

const AMBIGUITY_SAFE_PASSWORD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

export const ACCESS_MODES = Object.freeze({
  NONE: 'none',
  INVITE: 'invite',
  PROVISION: 'provision',
});

export const EMPLOYEE_ROLE_OPTIONS = FARM_STAFF_ROLE_OPTIONS;

export function normalizeEmployeeRole(value) {
  const token = String(value ?? '').trim().replace(/[-\s]+/g, '_').toUpperCase();
  if (token === 'FARMHAND') return 'FARM_HAND';
  if (token === 'MANAGER') return 'FARM_MANAGER';
  if (token === 'SUPERVISOR') return 'FARM_SUPERVISOR';
  return EMPLOYEE_ROLE_OPTIONS.some((option) => option.value === token) ? token : 'FARM_HAND';
}

export function formatSalaryInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? Number(digits).toLocaleString('en-KE') : '';
}

export function parseSalaryInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function validateEmployeeFields({ name, role, phoneNumber, baseSalary }) {
  const errors = {};
  if (!String(name ?? '').trim()) errors.name = 'Enter the employee’s full name.';
  if (!role) errors.role = 'Select a job role.';
  if (!normalizeKenyanPhone(phoneNumber)) errors.phoneNumber = 'Enter a valid Kenyan mobile number, for example 0712 345 678.';
  if (parseSalaryInput(baseSalary) <= 0) errors.baseSalary = 'Enter a salary greater than KES 0.';
  return errors;
}

export function generateSecurePassword(length = 16, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.getRandomValues) {
    throw new Error('Secure password generation is unavailable in this browser.');
  }

  const size = Math.max(16, Number(length) || 16);
  const randomValues = new Uint32Array(size);
  cryptoProvider.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => AMBIGUITY_SAFE_PASSWORD_CHARACTERS[value % AMBIGUITY_SAFE_PASSWORD_CHARACTERS.length]).join('');
}

export function validateProvisioningFields({ mode, password, requiresPasswordReset }) {
  if (mode !== ACCESS_MODES.PROVISION) return {};
  const errors = {};
  if (String(password ?? '').length < 12) errors.password = 'Use at least 12 characters or generate a secure password.';
  if (requiresPasswordReset !== true) errors.requiresPasswordReset = 'A password reset is required for farmer-provisioned accounts.';
  return errors;
}
