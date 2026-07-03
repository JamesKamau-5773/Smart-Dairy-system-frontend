const SUPER_ADMIN_VALUES = new Set(['SUPER_ADMIN', 'SUPERADMIN']);
const ADMIN_VALUES = new Set(['ADMIN', 'PRIMARY_ADMIN', 'OWNER', 'COOP_ADMIN', 'COOPERATIVE_ADMIN']);
const FARM_ADMIN_VALUES = new Set(['FARM_ADMIN', 'FARM_MANAGER']);
const FARMER_VALUES = new Set(['FARMER', 'HERDSMAN', 'MEMBER']);
const ORGANIZATIONAL_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FARM_ADMIN']);
const OPERATIONAL_ROLE_ALIASES = new Map([
  ['HERDSMAN', 'HERDSMAN'],
  ['VET_ASSISTANT', 'VET_ASSISTANT'],
  ['CLERK', 'CLERK'],
  ['FINANCE', 'FINANCE'],
  ['FARMER', 'FARMER'],
  ['MEMBER', 'FARMER'],
]);

const toRoleToken = (value) => String(value || '').trim().replace(/[-\s]+/g, '_').toUpperCase();

export const isSingleTenantUser = (user) => {
  if (!user) return false;

  const tenantType = String(user.tenant_type || user.tenantType || '').toLowerCase();
  if (tenantType === 'single') return true;

  // Backward-compatibility for older sessions that have tenant scope but no cooperative scope.
  return Boolean(user.tenant_id || user.tenantId) && !Boolean(user.cooperative_id || user.cooperativeId);
};

const pickPrimaryRole = (user) => {
  if (!user) return '';

  if (user.role) return toRoleToken(user.role);

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return toRoleToken(user.roles[0]);
  }

  return '';
};

const normalizeRoleToken = (value) => {
  const token = toRoleToken(value);

  if (SUPER_ADMIN_VALUES.has(token)) return 'SUPER_ADMIN';
  if (ADMIN_VALUES.has(token)) return 'ADMIN';
  if (FARM_ADMIN_VALUES.has(token)) return 'FARM_ADMIN';
  if (FARMER_VALUES.has(token)) return 'FARMER';
  if (OPERATIONAL_ROLE_ALIASES.has(token)) return OPERATIONAL_ROLE_ALIASES.get(token);

  return token;
};

const collectRoleTokens = (user) => {
  if (!user) return [];

  const roleSet = [
    user.organization_role,
    user.organizational_role,
    user.org_role,
    user.operational_role,
    user.farm_role,
    user.role,
  ];

  if (Array.isArray(user.roles)) {
    roleSet.push(...user.roles);
  }

  if (Array.isArray(user.role_set)) {
    roleSet.push(...user.role_set);
  }

  return roleSet
    .map((value) => normalizeRoleToken(value))
    .filter(Boolean);
};

export const getRoleSet = (user) => {
  const allRoleTokens = collectRoleTokens(user);
  return [...new Set(allRoleTokens)];
};

export const getPermissionSet = (user) => {
  if (!user) return [];

  const rawPermissions = user.permission_set ?? user.permissions ?? [];

  if (Array.isArray(rawPermissions)) {
    return [...new Set(rawPermissions.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
  }

  if (rawPermissions && typeof rawPermissions === 'object') {
    return Object.entries(rawPermissions)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => String(key).trim().toLowerCase());
  }

  return [];
};

export const getOrganizationRole = (user) => {
  const organizationRole = getRoleSet(user).find((role) => ORGANIZATIONAL_ROLES.has(role));
  return organizationRole || 'FARMER';
};

export const getOperationalRoles = (user) => {
  return getRoleSet(user).filter((role) => !ORGANIZATIONAL_ROLES.has(role));
};

export const normalizeRole = (user) => {
  const token = normalizeRoleToken(pickPrimaryRole(user));

  if (ORGANIZATIONAL_ROLES.has(token)) return token;
  if (token === 'FARMER') return 'FARMER';

  return token || 'FARMER';
};

export const hasRole = (user, allowedRoles = []) => {
  const roleSet = getRoleSet(user);
  const normalizedAllowedRoles = allowedRoles.map((value) => normalizeRoleToken(value));
  return normalizedAllowedRoles.some((role) => roleSet.includes(role));
};

export const isSuperAdmin = (user) => normalizeRole(user) === 'SUPER_ADMIN';
export const isCooperativeAdmin = (user) => normalizeRole(user) === 'ADMIN';
export const isFarmAdmin = (user) => normalizeRole(user) === 'FARM_ADMIN';
export const isFarmer = (user) => normalizeRole(user) === 'FARMER';

export const hasPermission = (user, permission) => {
  if (!user || !permission) return false;

  const expected = String(permission).trim().toLowerCase();
  return getPermissionSet(user).includes(expected);
};

// Command Center policy matrix (kept close to the guard for easy maintenance):
// - single-farm users: always allowed (legacy self-serve behavior)
// - organizational admins: SUPER_ADMIN, ADMIN, FARM_ADMIN
// - delegated users: any role with explicit dashboard permission
export const canAccessCommandCenter = (user) => {
  if (isSingleTenantUser(user)) return true;
  if (isSuperAdmin(user) || isCooperativeAdmin(user) || isFarmAdmin(user)) return true;

  return hasPermission(user, 'command_center:view')
    || hasPermission(user, 'dashboard:view')
    || hasPermission(user, 'view_command_center');
};

export const canViewAdminControls = (user) => isSingleTenantUser(user) || isSuperAdmin(user) || isCooperativeAdmin(user) || isFarmAdmin(user);

export const getDefaultLandingPath = (user) => {
  if (isSingleTenantUser(user)) return '/dashboard';
  if (isSuperAdmin(user)) return '/system-admin/dashboard';
  if (isCooperativeAdmin(user)) return '/cooperative-admin/members';
  if (canAccessCommandCenter(user)) return '/dashboard';
  if (isFarmer(user)) return '/member/dashboard';
  return '/dashboard';
};
