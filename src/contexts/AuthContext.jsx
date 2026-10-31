/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, normalizeSessionUser, normalizeTenantProfile, tenantApi } from '../lib/backendApi';
import { clearSession, loadSession, saveSession } from '../lib/sessionStore';
import { tenantRef } from '../lib/tenantRef';
import { getAuthErrorMessage } from '../lib/authErrorMessages';

const AuthContext = createContext();

const isSessionRejected = (error) => [401, 403].includes(error?.response?.status);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const savedUser = await loadSession();

      if (savedUser) {
        let restoredUser = null;
        try {
          restoredUser = normalizeSessionUser(savedUser);
        } catch (error) {
          console.warn('Discarding unreadable saved session.', error);
          await clearSession();
        }

        if (restoredUser) {
          // Open the app from the stored session straight away, so farmers can keep
          // working from cached data and the offline queue without a connection.
          tenantRef.tenantId = restoredUser.tenant_id ?? restoredUser.cooperative_id ?? null;
          tenantRef.farmId = restoredUser.farm_id ?? null;
          setCurrentUser(restoredUser);
          setIsLoading(false);

          // Verify the token in the background. Only an explicit rejection from the
          // server ends the session; no network, timeouts and server errors keep it.
          try {
            const verifiedUser = await authApi.me();
            if (cancelled) return;

            const normalizedUser = normalizeSessionUser(verifiedUser);
            tenantRef.tenantId = normalizedUser.tenant_id ?? normalizedUser.cooperative_id ?? null;
            tenantRef.farmId = normalizedUser.farm_id ?? null;
            setCurrentUser(normalizedUser);
            await saveSession(normalizedUser);
          } catch (error) {
            if (cancelled) return;
            if (!isSessionRejected(error)) {
              console.warn('Could not verify the saved session; continuing with it.', error);
              return;
            }

            console.warn('Saved session was rejected by the server.', error);
            setCurrentUser(null);
            await clearSession();
            tenantRef.tenantId = null;
            tenantRef.farmId = null;
          }
          return;
        }
      }

      try {
        const sessionUser = await authApi.me();

        if (cancelled) {
          return;
        }

        if (sessionUser) {
          let mergedUser = sessionUser;

          try {
            const profile = await tenantApi.profile();
            mergedUser = normalizeTenantProfile(profile, sessionUser);
          } catch {
            // Tenant profile can fail for roles that do not belong to a specific cooperative.
          }

          const normalizedUser = normalizeSessionUser(mergedUser);
          setCurrentUser(normalizedUser);
          await saveSession(normalizedUser);
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          setCurrentUser(null);
          await clearSession();
          tenantRef.tenantId = null;
          tenantRef.farmId = null;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    try {
      const user = await authApi.login(credentials);
      
      setCurrentUser(user);
      await saveSession(user);
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error, 'login') };
    }
  };

  const register = async (payload) => {
    try {
      const user = await authApi.register(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true };
    } catch (error) {
      const flow = payload?.role === 'SUPER_ADMIN' ? 'bootstrap' : 'register';
      return { success: false, error: getAuthErrorMessage(error, flow) };
    }
  };

  const claimAccount = async (payload) => {
    try {
      const user = await authApi.claimAccount(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true, user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error, 'claim') };
    }
  };

  const completeRequiredPasswordReset = async (payload) => {
    try {
      const user = await authApi.completeRequiredPasswordReset(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true, user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error, 'passwordReset') };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      console.error('Logout request failed, clearing local state anyway.');
    } finally {
      setCurrentUser(null);
      await clearSession();
      
      // Wipe the network interceptor variables
      tenantRef.tenantId = null;
      tenantRef.farmId = null;
    }
  };

  // Exposed for TenantContext to update the active farm seamlessly
  const updateSession = async (updatedUser) => {
    const normalizedUser = normalizeSessionUser(updatedUser);
    setCurrentUser(normalizedUser);
    await saveSession(normalizedUser);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { currentUser, login, register, claimAccount, completeRequiredPasswordReset, logout, updateSession, isLoading } },
    children,
  );
}

export const useAuth = () => useContext(AuthContext);
