import axios from 'axios';
import { enqueueRequest, isSerializablePayload } from './offlineMutationStore';
import { isReplayableMutation } from './offlinePolicy';
import { tenantRef } from './tenantRef';
import { httpClientConfig } from './httpClientConfig';
import { API_BASE_URL } from './apiBaseUrl';
import { SESSION_EXPIRED_EVENT } from './sessionEvents';
import { notifyDemoRefusal } from './demoRefusal';

export function resolveBackendAssetUrl(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;

  const backendOrigin = /^https?:\/\//i.test(API_BASE_URL)
    ? new URL(API_BASE_URL).origin
    : window.location.origin;

  return new URL(value, backendOrigin).toString();
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  ...httpClientConfig,
});

// Development only: VITE_MOCK_DASHBOARD=full|empty|negative answers the Command Center's
// summary and trend requests from fixtures (src/dev/mockDashboard.js); everything else still
// goes to the backend. `import.meta.env.DEV` is false in builds, so this is dropped from them.
if (import.meta.env.DEV && import.meta.env.VITE_MOCK_DASHBOARD) {
  apiClient.interceptors.request.use(async (config) => {
    const { mockDashboardRequest } = await import('../dev/mockDashboard.js');
    return mockDashboardRequest(config, import.meta.env.VITE_MOCK_DASHBOARD);
  });
}

// A key represents one logical submission.  It must be reused only when that
// exact submission is retried, never as a business-record identifier.
export function createIdempotencyKey() {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  return `web:${id}`;
}

function isNetworkFailure(error) {
  return !error.response && (
    error.code === 'ERR_NETWORK'
    || error.code === 'ECONNABORTED'
    || navigator.onLine === false
  );
}

function restoreStructuredPayload(config) {
  const contentType = config.headers?.['Content-Type'] ?? config.headers?.['content-type'] ?? '';
  if (typeof config.data !== 'string' || !contentType.includes('application/json')) {
    return config.data;
  }
  try {
    return JSON.parse(config.data);
  } catch {
    return config.data;
  }
}

apiClient.interceptors.request.use((config) => {
  const sessionStr = sessionStorage.getItem('jivu_user');
  
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    // Cookie-only sessions (Google sign-in) have no token; the HttpOnly cookie authenticates them.
    if (session.token) {
      config.headers['Authorization'] = `Bearer ${session.token}`;
    }

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

  if (isReplayableMutation(config) && isSerializablePayload(config.data)) {
    config.headers['Idempotency-Key'] ||= createIdempotencyKey();
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && sessionStorage.getItem('jivu_user')) {
      // The page stays mounted (keeping anything typed) while AuthProvider asks the farmer to sign in again.
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    notifyDemoRefusal(error);
    if (!config || !isNetworkFailure(error) || !isReplayableMutation(config)) {
      return Promise.reject(error);
    }

    const data = restoreStructuredPayload(config);
    if (!isSerializablePayload(data)) {
      return Promise.reject(error);
    }

    const entry = await enqueueRequest({
      method: config.method,
      url: config.url,
      data,
      headers: {
        'Idempotency-Key': config.headers?.['Idempotency-Key'],
      },
    });

    return {
      data: {
        queued: true,
        offline: true,
        queue_id: entry.id,
        message: 'Saved on this device and waiting to synchronize.',
      },
      status: 202,
      statusText: 'Accepted Offline',
      headers: {},
      config,
      request: error.request,
    };
  },
);

export default apiClient;
