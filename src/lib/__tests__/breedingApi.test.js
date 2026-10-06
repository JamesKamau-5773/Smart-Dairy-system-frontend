import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiClientMock = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock('../apiClient', () => ({
  default: apiClientMock,
  resolveBackendAssetUrl: vi.fn(),
}));

import { breedingApi } from '../backendApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('breedingApi.updateLog', () => {
  it('updates an existing breeding log through the verified PUT route', async () => {
    const payload = { cow_id: 46, insemination_date: '2026-09-15' };
    const record = { id: 9, ...payload, status: 'Pending' };
    apiClientMock.put.mockResolvedValue({ data: record });

    await expect(breedingApi.updateLog(9, payload)).resolves.toEqual(record);
    expect(apiClientMock.put).toHaveBeenCalledWith('/operations/breeding-logs/9', payload);
  });
});