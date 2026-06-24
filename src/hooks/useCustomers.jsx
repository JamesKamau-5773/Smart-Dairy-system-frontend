// src/hooks/useCustomers.jsx
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      // Replace with your actual API endpoint
      const response = await apiClient.get('/customers');
      return response.data;
    },
    // Placeholder data so your modal loads while you build the backend
    initialData: [
      { id: 1, name: 'Rift Valley Cooperative' },
      { id: 2, name: 'Local Dairy Hub' },
      { id: 3, name: 'Nakuru Fresh Milk' },
    ],
  });
}