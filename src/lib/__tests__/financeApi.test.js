import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  default: apiClientMock,
  resolveBackendAssetUrl: vi.fn(),
}));

import { financeApi } from '../backendApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('financeApi.listLedgerEntries', () => {
  it('combines every ledger page and preserves the backend summary', async () => {
    const summary = { total_income: 21280, total_costs: 21755, total_profit: -475 };
    const pageItems = [
      Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
      Array.from({ length: 50 }, (_, index) => ({ id: index + 101 })),
      Array.from({ length: 9 }, (_, index) => ({ id: index + 151 })),
    ];
    pageItems.forEach((items, index) => {
      apiClientMock.get.mockResolvedValueOnce({
        data: {
          items,
          meta: { page: index + 1, pages: 3, per_page: 100, total: 159 },
          summary,
        },
      });
    });

    const result = await financeApi.listLedgerEntries({ farm_id: 'farm_1' });

    expect(apiClientMock.get).toHaveBeenCalledTimes(3);
    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/finance/ledger', {
      params: { farm_id: 'farm_1', page: 1, per_page: 100 },
    });
    expect(result.items).toHaveLength(159);
    expect(result.meta).toMatchObject({ page: 1, pages: 1, per_page: 159, total: 159 });
    expect(result.summary).toBe(summary);
  });
});