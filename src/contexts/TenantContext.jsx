import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { tenantRef } from '../lib/tenantRef';
import { queryClient } from '../providers/QueryProvider';

export const TenantContext = createContext();

export function TenantProvider({ children }) {
  const { currentUser, updateSession } = useAuth();
  const [activeFarm, setActiveFarm] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.tenant_id) {
      // 1. Sync the non-React Axios interceptor ref
      tenantRef.tenantId = currentUser.tenant_id;
      tenantRef.farmId = currentUser.farm_id;
      
      // 2. Set the React UI state
      setActiveFarm({
        id: currentUser.farm_id,
        name: currentUser.farm_name,
      });
    } else {
      tenantRef.tenantId = null;
      tenantRef.farmId = null;
      setActiveFarm(null);
    }
  }, [currentUser]);

  const switchFarm = async (newFarmId) => {
    if (!currentUser || currentUser.farm_id === newFarmId) return;
    
    setIsSwitching(true);
    try {
      const response = await axios.post('/api/auth/switch-farm', { farm_id: newFarmId });
      
      const updatedUser = {
        ...currentUser,
        farm_id: response.data.user.farm_id,
        farm_name: response.data.user.farm_name,
        token: response.data.token 
      };

      // Wipe the TanStack cache to guarantee zero data bleed between farms
      queryClient.clear();

      // Update global auth state which triggers the useEffect above
      updateSession(updatedUser);

    } catch (error) {
      console.error("Failed to switch farm context", error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <TenantContext.Provider value={{
      tenantId: currentUser?.tenant_id,
      tenantType: currentUser?.tenant_type,
      activeFarm,
      availableFarms: currentUser?.available_farms || [],
      isCooperative: currentUser?.tenant_type === 'cooperative',
      switchFarm,
      isSwitching
    }}>
      {children}
    </TenantContext.Provider>
  );
}