import axios from 'axios';

// A base instance for all API calls, configured to your backend's base URL.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can add interceptors here for handling auth tokens, etc.
// api.interceptors.request.use(...)

/**
 * A consistent way to get a human-readable error message from an API error.
 * @param {Error} error The error object from a catch block.
 * @returns {string} A user-friendly error message.
 */
export const getApiErrorMessage = (error) => {
  return error?.response?.data?.error || error.message || 'An unknown error occurred.';
};

/**
 * An object containing all finance-related API helper functions.
 */
export const financeApi = {
  // --- Customer/Buyer Endpoints ---
  listCustomers: () => api.get('/finance/customers').then(res => res.data),
  getCustomer: (id) => api.get(`/finance/customers/${id}`).then(res => res.data),
  createCustomer: (data) => api.post('/finance/customers', data).then(res => res.data),
  createBuyer: (data) => api.post('/finance/buyers', data).then(res => res.data),

  // --- Delivery Endpoints ---
  listDeliveries: (params) => api.get('/finance/deliveries', { params }).then(res => res.data),
  createDelivery: (data) => api.post('/finance/deliveries', data).then(res => res.data),
  updateDelivery: (id, data) => api.patch(`/finance/deliveries/${id}`, data).then(res => res.data),
  deleteDelivery: (id) => api.delete(`/finance/deliveries/${id}`).then(res => res.data),

  // --- Ledger Endpoints ---
  listLedgerEntries: (params) => api.get('/finance/ledger', { params }).then(res => res.data),
  createLedgerEntry: (data) => api.post('/finance/ledger', data).then(res => res.data),
};