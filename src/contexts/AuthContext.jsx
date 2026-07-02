import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, normalizeSessionUser, normalizeTenantProfile, tenantApi } from '../lib/backendApi';
import { tenantRef } from '../lib/tenantRef';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const savedUser = sessionStorage.getItem('jivu_user');

      if (savedUser) {
        try {
          const parsedUser = normalizeSessionUser(JSON.parse(savedUser));
          setCurrentUser(parsedUser);
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
          sessionStorage.setItem('jivu_user', JSON.stringify(normalizedUser));
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          setCurrentUser(null);
          sessionStorage.removeItem('jivu_user');
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
      sessionStorage.setItem('jivu_user', JSON.stringify(user));
      
      return { success: true };
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
      sessionStorage.setItem('jivu_user', JSON.stringify(user));

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
      sessionStorage.setItem('jivu_user', JSON.stringify(user));

      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.detail
        || 'Invite claim failed. Please verify your invite token and try again.';

      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout request failed, clearing local state anyway.');
    } finally {
      setCurrentUser(null);
      sessionStorage.removeItem('jivu_user');
      
      // Wipe the network interceptor variables
      tenantRef.tenantId = null;
      tenantRef.farmId = null;
    }
  };

  // Exposed for TenantContext to update the active farm seamlessly
  const updateSession = (updatedUser) => {
    const normalizedUser = normalizeSessionUser(updatedUser);
    setCurrentUser(normalizedUser);
    sessionStorage.setItem('jivu_user', JSON.stringify(normalizedUser));
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, register, claimAccount, logout, updateSession, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);