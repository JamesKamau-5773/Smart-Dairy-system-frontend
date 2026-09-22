/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, normalizeSessionUser, normalizeTenantProfile, tenantApi } from '../lib/backendApi';
import { clearSession, loadSession, saveSession } from '../lib/sessionStore';
import { tenantRef } from '../lib/tenantRef';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const savedUser = await loadSession();

      if (savedUser) {
        try {
          const restoredUser = normalizeSessionUser(savedUser);
          tenantRef.tenantId = restoredUser.tenant_id ?? restoredUser.cooperative_id ?? null;
          tenantRef.farmId = restoredUser.farm_id ?? null;
          setCurrentUser(restoredUser);
          setIsLoading(false);

          // If we already have a restored session, keep it authoritative for this reload.
          // The backend cookie can belong to a different browser session, which would
          // otherwise overwrite the user's active farm and role after refresh.
          return;
        } catch (error) {
          console.warn('Failed to restore saved session.', error);
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
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.detail
        || 'Invalid credentials or inactive account';

      return { success: false, error: message };
    }
  };

  const register = async (payload) => {
    try {
      const user = await authApi.register(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.detail
        || 'Registration failed. Please check your details and try again.';

      return { success: false, error: message };
    }
  };

  const claimAccount = async (payload) => {
    try {
      const user = await authApi.claimAccount(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.detail
        || 'Invite claim failed. Please verify your invite token and try again.';

      return { success: false, error: message };
    }
  };

  const completeRequiredPasswordReset = async (payload) => {
    try {
      const user = await authApi.completeRequiredPasswordReset(payload);

      setCurrentUser(user);
      await saveSession(user);

      return { success: true, user };
    } catch (error) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.detail
        || 'Password update failed. Please try again.';

      return { success: false, error: message };
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