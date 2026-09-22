import { describe, expect, it } from 'vitest';
import {
  ACCESS_MODES,
  formatKenyanPhoneInput,
  formatSalaryInput,
  generateSecurePassword,
  normalizeEmployeeRole,
  normalizeKenyanPhone,
  parseSalaryInput,
  validateEmployeeFields,
  validateProvisioningFields,
} from '../staffAccessForm';

describe('staff access form helpers', () => {
  it('formats salary and Kenyan phone inputs while preserving canonical payload values', () => {
    expect(formatSalaryInput('35000')).toBe('35,000');
    expect(parseSalaryInput('35,000')).toBe(35000);
    expect(formatKenyanPhoneInput('0712345678')).toBe('0712 345 678');
    expect(formatKenyanPhoneInput('+254712345678')).toBe('+254 712 345 678');
    expect(normalizeKenyanPhone('0712 345 678')).toBe('254712345678');
    expect(normalizeEmployeeRole('Farm Hand')).toBe('FARM_HAND');
    expect(normalizeEmployeeRole('Farm Manager')).toBe('FARM_MANAGER');
  });

  it('returns explicit employee and provisioning validation errors', () => {
    expect(validateEmployeeFields({ name: '', role: '', phoneNumber: '0712', baseSalary: '0' })).toEqual({
      name: 'Enter the employee’s full name.',
      role: 'Select a job role.',
      phoneNumber: 'Enter a valid Kenyan mobile number, for example 0712 345 678.',
      baseSalary: 'Enter a salary greater than KES 0.',
    });
    expect(validateProvisioningFields({ mode: ACCESS_MODES.PROVISION, password: 'short', requiresPasswordReset: false })).toHaveProperty('password');
  });

  it('uses a cryptographic provider and excludes ambiguous password characters', () => {
    const cryptoProvider = { getRandomValues: (values) => values.fill(7) };
    const password = generateSecurePassword(16, cryptoProvider);
    expect(password).toHaveLength(16);
    expect(password).not.toMatch(/[0O1Il]/);
  });
});