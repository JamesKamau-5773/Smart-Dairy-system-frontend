import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefetchOfflineEssentials } from '../usePrefetchOfflineEssentials';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import { herdApi } from '../../lib/backendApi';

void React;
afterEach(cleanup);

vi.mock('../useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  herdApi: { list: vi.fn().mockResolvedValue([{ id: 5, name: 'Mrembo' }]) },
}));

describe('usePrefetchOfflineEssentials', () => {
  it('caches the cow list the milk form needs offline', async () => {
    const queryClient = new QueryClient();
    renderHook(() => usePrefetchOfflineEssentials(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEYS.COWS('t1', 'f1'))).toEqual([{ id: 5, name: 'Mrembo' }]));
    expect(herdApi.list).toHaveBeenCalledTimes(1);
  });
});
