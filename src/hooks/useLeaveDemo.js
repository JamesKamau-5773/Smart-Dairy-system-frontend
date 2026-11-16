import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Ways out of the demo. Each one ends the demo session through the normal logout first, so a
 * visitor never registers or logs in while still inside the demo session.
 */
export function useLeaveDemo() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const leaveTo = useCallback(async (path) => {
    await logout();
    navigate(path, { replace: true });
  }, [logout, navigate]);

  return useMemo(() => ({
    toRegister: () => leaveTo('/register'),
    toLogin: () => leaveTo('/login'),
    // "/" is the static landing page, outside the SPA router, so it needs a full page load.
    toHome: async () => {
      await logout();
      window.location.assign('/');
    },
  }), [leaveTo, logout]);
}
