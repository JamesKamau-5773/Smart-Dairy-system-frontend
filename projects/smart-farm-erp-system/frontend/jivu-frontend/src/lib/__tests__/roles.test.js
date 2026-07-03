import { describe, expect, it } from 'vitest';
import { canAccessCommandCenter, getDefaultLandingPath, getOrganizationRole, getPermissionSet, getRoleSet } from '../roles';

describe('roles policy helpers', () => {
  it('normalizes layered organizational and operational roles', () => {
    const user = {
      organization_role: 'coop_admin',
      farm_role: 'herdsman',
      roles: ['finance'],
    };

    expect(getOrganizationRole(user)).toBe('ADMIN');
    expect(getRoleSet(user)).toEqual(expect.arrayContaining(['ADMIN', 'HERDSMAN', 'FINANCE']));
  });

  it('normalizes permission sets from arrays and objects', () => {
    expect(getPermissionSet({ permissions: ['Dashboard:View', 'command_center:view'] })).toEqual(
      expect.arrayContaining(['dashboard:view', 'command_center:view'])
    );

    expect(getPermissionSet({ permissions: { 'dashboard:view': true, 'finance:view': false } })).toEqual(
      expect.arrayContaining(['dashboard:view'])
    );
  });
});

describe('canAccessCommandCenter matrix', () => {
  it('allows single-tenant users for backward compatibility', () => {
    const user = { tenant_type: 'single', role: 'FARMER' };
    expect(canAccessCommandCenter(user)).toBe(true);
    expect(getDefaultLandingPath(user)).toBe('/dashboard');
  });

  it('allows organizational admins by role', () => {
    expect(canAccessCommandCenter({ role: 'SUPER_ADMIN', tenant_type: 'cooperative' })).toBe(true);
    expect(canAccessCommandCenter({ role: 'COOP_ADMIN', tenant_type: 'cooperative' })).toBe(true);
    expect(canAccessCommandCenter({ role: 'FARM_ADMIN', tenant_type: 'cooperative' })).toBe(true);
  });

  it('allows delegated operational users with explicit dashboard permission', () => {
    const user = {
      tenant_type: 'cooperative',
      role: 'HERDSMAN',
      permissions: ['dashboard:view'],
    };

    expect(canAccessCommandCenter(user)).toBe(true);
    expect(getDefaultLandingPath(user)).toBe('/dashboard');
  });

  it('denies non-delegated operational users and routes them to member dashboard', () => {
    const user = {
      tenant_type: 'cooperative',
      role: 'HERDSMAN',
      permissions: ['tasks:view'],
    };

    expect(canAccessCommandCenter(user)).toBe(false);
    expect(getDefaultLandingPath(user)).toBe('/member/dashboard');
  });
});
