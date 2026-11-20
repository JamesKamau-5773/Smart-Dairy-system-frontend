import { canViewAdminControls, hasPageAccess } from './roles';

// Which menu links a user sees, shared by the sidebar and the phone bottom bar so the two never
// disagree. Hiding a link is a convenience only: the backend decides what each user may do.

/** Roles the unit helpers page lets in (its route and its menu link both use this). */
export const UNIT_HELPER_ROLES = Object.freeze(['SUPER_ADMIN', 'ADMIN']);

/** Production Log: the farm's plan and the user's page access include milk records. */
export const canSeeProductionLog = (user) => hasPageAccess(user, 'production');

/** Buyers list: managers and admins with access to the customers area. */
export const canSeeBuyers = (user) => canViewAdminControls(user) && hasPageAccess(user, 'customers');

/** Ledger: managers and admins with access to the finance area. */
export const canSeeLedger = (user) => canViewAdminControls(user) && hasPageAccess(user, 'finance');
