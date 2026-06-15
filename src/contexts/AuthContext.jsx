import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // We use raw axios for auth to avoid interceptor loops
import { tenantRef } from '../lib/tenantRef';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('jivu_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const user = response.data.user;
      
      setCurrentUser(user);
      sessionStorage.setItem('jivu_user', JSON.stringify(user));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid credentials or inactive account' };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
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
    setCurrentUser(updatedUser);
    sessionStorage.setItem('jivu_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateSession, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);