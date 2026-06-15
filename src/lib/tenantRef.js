/**
 * Mutable reference holding the active tenant and farm IDs.
 * TenantContext writes to this file.
 * apiClient.js reads from this file to attach headers dynamically.
 */
export const tenantRef = {
  tenantId: null,
  farmId: null
};