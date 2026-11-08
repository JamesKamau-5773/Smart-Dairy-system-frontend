import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPageAccess } from '../lib/roles';
import { getFirstAllowedPath, getPageKeyForPath, PAGE_TITLES } from '../lib/pageRoutes';
import NoPageAccess from '../components/ui/NoPageAccess';
import LockedFeature from '../components/plan/LockedFeature';

/**
 * Gates the current page twice: by the user's page access (role), then by the farm's plan.
 * The page key doubles as the plan feature key (BR-014), so which areas are locked comes
 * only from the backend's `entitlements.features`; while that's unknown nothing is locked.
 */
export default function PageAccessGate({ children }) {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const access = getPageKeyForPath(pathname);
  if (access && !hasPageAccess(currentUser, access)) {
    // Say why, rather than silently landing the person somewhere else.
    return <NoPageAccess allowedPath={getFirstAllowedPath(currentUser)} />;
  }
  if (!access) return children;
  return <LockedFeature feature={access} title={PAGE_TITLES[access] ?? 'This page'}>{children}</LockedFeature>;
}
