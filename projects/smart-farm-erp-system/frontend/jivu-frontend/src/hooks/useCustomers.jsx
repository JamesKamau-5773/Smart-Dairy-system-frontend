// src/hooks/useCustomers.jsx
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { useTenant } from './useTenant';

export function useCustomers() {
  const { tenantId, farmId } = useTenant();

  return useQuery({
    queryKey: ['customers', tenantId, farmId],
    queryFn: async () => {
      const response = await apiClient.get('/customers');
      return response.data;
    },
    enabled: !!tenantId && !!farmId,
  });
}