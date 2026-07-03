import axios from 'axios';
import { tenantRef } from './tenantRef';
import { httpClientConfig } from './httpClientConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, 
  ...httpClientConfig,
});

apiClient.interceptors.request.use((config) => {
  const sessionStr = sessionStorage.getItem('jivu_user');
  
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    config.headers['Authorization'] = `Bearer ${session.token}`;

    const sessionTenantId = session.tenant_id ?? session.cooperative_id;

    if (!tenantRef.tenantId && sessionTenantId) {
      tenantRef.tenantId = sessionTenantId;
    }

    if (!tenantRef.farmId && session.farm_id) {
      tenantRef.farmId = session.farm_id;
    }
  }

  // Inject Isolation Headers
  if (tenantRef.tenantId) {
    config.headers['X-Tenant-ID'] = tenantRef.tenantId;
  }
  if (tenantRef.farmId) {
    config.headers['X-Farm-ID'] = tenantRef.farmId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;