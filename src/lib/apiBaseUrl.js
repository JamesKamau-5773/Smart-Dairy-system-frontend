const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export function toApiBaseUrl(value = DEFAULT_API_BASE_URL) {
  const baseUrl = String(value).trim().replace(/\/+$/, '');

  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
}

export const API_BASE_URL = toApiBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api$/i, '');
