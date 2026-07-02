import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { tenantRef } from '../lib/tenantRef';
import { queryClient } from '../providers/QueryProvider';
import { authApi } from '../lib/backendApi';

export const TenantContext = createContext();

export function TenantProvider({ children }) {
  const { currentUser, updateSession } = useAuth();
  const [activeFarm, setActiveFarm] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const scopedTenantId = currentUser?.tenant_id ?? currentUser?.cooperative_id;
    if (currentUser && scopedTenantId) {
      // 1. Sync the non-React Axios interceptor ref
      tenantRef.tenantId = scopedTenantId;
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
      const response = await authApi.switchFarm(newFarmId);
      
      const updatedUser = {
        ...currentUser,
        ...response,
        farm_id: response.farm_id,
        farm_name: response.farm_name,
        token: response.token 
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
      tenantId: currentUser?.tenant_id ?? currentUser?.cooperative_id,
      cooperativeId: currentUser?.cooperative_id ?? currentUser?.tenant_id,
      cooperativeName: currentUser?.cooperative_name ?? currentUser?.tenant_name,
      tenantType: currentUser?.tenant_type,
      activeFarm,
      availableFarms: currentUser?.available_farms || [],
      isCooperative: currentUser?.tenant_type === 'cooperative' || Boolean(currentUser?.cooperative_id),
      switchFarm,
      isSwitching
    }}>
      {children}
    </TenantContext.Provider>
  );
}