import { useAuth } from '../contexts/AuthContext';

/**
 * Whether the signed-in session is the public demo, exactly as the backend reports it on the
 * session (`is_demo`, docs/demo-account.md). Anything other than `true` (missing, null) is not a
 * demo; nothing here infers it from the name, the tenant or the token.
 *
 * `expiresAt` is the backend's `session_expires_at` (ISO 8601), or null when it didn't send one.
 *
 * @returns {{ isDemo: boolean, expiresAt: string|null }}
 */
export function useDemoSession() {
  const { currentUser } = useAuth();
  const expiresAt = currentUser?.session_expires_at;
  return {
    isDemo: currentUser?.is_demo === true,
    expiresAt: typeof expiresAt === 'string' && expiresAt ? expiresAt : null,
  };
}
