import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailySummary } from '../useDailySummary';

const summary = vi.hoisted(() => vi.fn());
vi.mock('../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, productionApi: { ...actual.productionApi, summary } };
});
vi.mock('../useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => vi.clearAllMocks());

describe('useDailySummary', () => {
  it('returns the backend’s figures once loaded', async () => {
    summary.mockResolvedValue({ production_total_liters: 84.5, cows_milked: 7, remaining_milk_liters: -3 });
    const { result } = renderHook(() => useDailySummary(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasRecordsToday).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.figures.totalLiters).toBe(84.5);
    expect(result.current.figures.cowsMilked).toBe(7);
    expect(result.current.figures.remainingLiters).toBe(-3);
    expect(result.current.hasRecordsToday).toBe(true);
  });

  it('says there are no records today when the backend reports no cows milked', async () => {
    summary.mockResolvedValue({ cows_milked: 0, net_margin_kes: 0 });
    const { result } = renderHook(() => useDailySummary(), { wrapper });
    await waitFor(() => expect(result.current.hasRecordsToday).toBe(false));
  });

  it('does not claim an empty day when the summary fails', async () => {
    summary.mockRejectedValue(new Error('HTTP 503'));
    const { result } = renderHook(() => useDailySummary(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasRecordsToday).toBeNull();
    expect(result.current.figures.totalLiters).toBeNull();
  });
});
