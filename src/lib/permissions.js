// Lightweight permission helpers to keep UI components SRP-compliant.
export function isPrimaryAdmin(user) {
  if (!user) return false;

  // Common role shapes we may receive from the API
  const role = (user.role || '').toString().toLowerCase();
  if (['primary_admin', 'admin', 'owner', 'superadmin', 'super_admin'].includes(role)) return true;

  // Some APIs return roles as an array
  if (Array.isArray(user.roles)) {
    const normalized = user.roles.map(r => String(r).toLowerCase());
    if (normalized.includes('primary_admin') || normalized.includes('admin')) return true;
  }

  // Alternate boolean flags
  if (user.is_primary_admin || user.isPrimaryAdmin || user.is_admin) return true;

  return false;
}

export function hasRole(user, targetRole) {
  if (!user || !targetRole) return false;

  const normalizedTarget = targetRole.toString().toLowerCase();

  // Check single role string
  const role = (user.role || '').toString().toLowerCase();
  if (role === normalizedTarget) return true;

  // Check roles array
  if (Array.isArray(user.roles)) {
    const normalizedRoles = user.roles.map(r => String(r).toLowerCase());
    if (normalizedRoles.includes(normalizedTarget)) return true;
  }

  return false;
}

export function canAccessHerdsmanView(user) {
  return isPrimaryAdmin(user) || hasRole(user, 'FARMER') || hasRole(user, 'Herdsman');
}

export default { isPrimaryAdmin, hasRole, canAccessHerdsmanView };
