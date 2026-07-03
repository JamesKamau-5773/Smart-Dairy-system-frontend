import { describe, it, expect } from 'vitest';
import { isPrimaryAdmin } from '../permissions';

describe('isPrimaryAdmin', () => {
  it('returns true for primary admin role string', () => {
    expect(isPrimaryAdmin({ role: 'PRIMARY_ADMIN' })).toBe(true);
  });

  it('returns true for admin in roles array', () => {
    expect(isPrimaryAdmin({ roles: ['user', 'admin'] })).toBe(true);
  });

  it('returns true for boolean flags', () => {
    expect(isPrimaryAdmin({ isPrimaryAdmin: true })).toBe(true);
    expect(isPrimaryAdmin({ is_primary_admin: true })).toBe(true);
  });

  it('returns false for non-admin', () => {
    expect(isPrimaryAdmin({ role: 'FARMER' })).toBe(false);
    expect(isPrimaryAdmin(null)).toBe(false);
  });
});
