import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { tenantRef } from '../lib/tenantRef';
import { queryClient } from '../providers/QueryProvider';
import { authApi } from '../lib/backendApi';

export const TenantContext = createContext();
const ACTIVE_FARM_STORAGE_KEY = 'jivu_active_farm';

function readStoredActiveFarm() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_FARM_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      id: parsed.id ?? null,
      name: parsed.name ?? null,
    };
  } catch {
    return null;
  }
}

function writeStoredActiveFarm(farm) {
  if (!farm?.id) {
    sessionStorage.removeItem(ACTIVE_FARM_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(ACTIVE_FARM_STORAGE_KEY, JSON.stringify({
    id: farm.id,
    name: farm.name ?? null,
  }));
}

export function TenantProvider({ children }) {
  const { currentUser, updateSession } = useAuth();
  const [activeFarm, setActiveFarm] = useState(() => readStoredActiveFarm());
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const scopedTenantId = currentUser?.tenant_id ?? currentUser?.cooperative_id;
    if (currentUser && scopedTenantId) {
      const availableFarms = Array.isArray(currentUser.available_farms) ? currentUser.available_farms : [];
      const storedActiveFarm = readStoredActiveFarm();
      const currentFarmId = currentUser.farm_id ?? storedActiveFarm?.id ?? availableFarms[0]?.id ?? null;
      const currentFarmName = currentUser.farm_name
        ?? storedActiveFarm?.name
        ?? availableFarms.find((farm) => farm.id === currentFarmId)?.name
        ?? availableFarms[0]?.name
        ?? null;

      // 1. Sync the non-React Axios interceptor ref
      tenantRef.tenantId = scopedTenantId;
      tenantRef.farmId = currentFarmId;
      
      // 2. Set the React UI state
      const resolvedActiveFarm = currentFarmId
        ? { id: currentFarmId, name: currentFarmName }
        : null;

      setActiveFarm(resolvedActiveFarm);
      writeStoredActiveFarm(resolvedActiveFarm);
    } else {
      tenantRef.tenantId = null;
      tenantRef.farmId = null;
      sessionStorage.removeItem(ACTIVE_FARM_STORAGE_KEY);
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
      writeStoredActiveFarm({ id: updatedUser.farm_id, name: updatedUser.farm_name });

    } catch (error) {
      console.error("Failed to switch farm context", error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <TenantContext.Provider value={{
      tenantId: currentUser?.tenant_id ?? currentUser?.cooperative_id,
      farmId: activeFarm?.id ?? currentUser?.farm_id ?? null,
      farmName: activeFarm?.name ?? currentUser?.farm_name ?? null,
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