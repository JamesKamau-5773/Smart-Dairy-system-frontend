import { FARM_STAFF_ROLE_OPTIONS } from './staffOnboarding';
import { normalizeKenyanPhone } from './phone';
import { staffCopy } from '../i18n/staff';

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
  if (!String(name ?? '').trim()) errors.name = staffCopy.validation.name;
  if (!role) errors.role = staffCopy.validation.role;
  if (!normalizeKenyanPhone(phoneNumber)) errors.phoneNumber = staffCopy.validation.phone;
  if (parseSalaryInput(baseSalary) <= 0) errors.baseSalary = staffCopy.validation.salary;
  return errors;
}

export function generateSecurePassword(length = 16, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.getRandomValues) {
    throw new Error(staffCopy.validation.noSecureRandom);
  }

  const size = Math.max(16, Number(length) || 16);
  const randomValues = new Uint32Array(size);
  cryptoProvider.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => AMBIGUITY_SAFE_PASSWORD_CHARACTERS[value % AMBIGUITY_SAFE_PASSWORD_CHARACTERS.length]).join('');
}

export function validateProvisioningFields({ mode, password, requiresPasswordReset }) {
  if (mode !== ACCESS_MODES.PROVISION) return {};
  const errors = {};
  if (String(password ?? '').length < 12) errors.password = staffCopy.validation.password;
  if (requiresPasswordReset !== true) errors.requiresPasswordReset = staffCopy.validation.passwordReset;
  return errors;
}
