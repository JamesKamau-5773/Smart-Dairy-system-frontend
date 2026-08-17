import {
  canViewAdminControls,
  getRoleSet,
  hasRole as hasAnyRole,
  isCooperativeAdmin,
  isSuperAdmin,
} from './roles';

// Lightweight permission helpers to keep UI components SRP-compliant.
export function isPrimaryAdmin(user) {
  if (!user) return false;
  if (user.isPrimaryAdmin === true || user.is_primary_admin === true) return true;
  if (canViewAdminControls(user)) return true;
  // canViewAdminControls only inspects the user's single primary role; also check the
  // full role set so an 'admin' entry anywhere in a multi-role array still counts.
  return getRoleSet(user).includes('ADMIN');
}

export function hasRole(user, targetRole) {
  if (!targetRole) return false;
  return hasAnyRole(user, [targetRole]);
}

export function canAccessHerdsmanView(user) {
  return isSuperAdmin(user) || isCooperativeAdmin(user) || hasAnyRole(user, ['FARMER', 'HERDSMAN']);
}

export default { isPrimaryAdmin, hasRole, canAccessHerdsmanView };
