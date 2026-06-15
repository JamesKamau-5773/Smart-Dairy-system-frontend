import axios from 'axios';
import { tenantRef } from './tenantRef';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000, 
});

apiClient.interceptors.request.use((config) => {
  const sessionStr = sessionStorage.getItem('jivu_user');
  
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    config.headers['Authorization'] = `Bearer ${session.token}`;
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