import {
  canViewAdminControls,
  hasRole as hasAnyRole,
  isCooperativeAdmin,
  isSuperAdmin,
} from './roles';

// Lightweight permission helpers to keep UI components SRP-compliant.
export function isPrimaryAdmin(user) {
  return canViewAdminControls(user);
}

export function hasRole(user, targetRole) {
  if (!targetRole) return false;
  return hasAnyRole(user, [targetRole]);
}

export function canAccessHerdsmanView(user) {
  return isSuperAdmin(user) || isCooperativeAdmin(user) || hasAnyRole(user, ['FARMER', 'HERDSMAN']);
}

export default { isPrimaryAdmin, hasRole, canAccessHerdsmanView };
