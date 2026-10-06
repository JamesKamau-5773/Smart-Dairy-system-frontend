import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  request: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  default: apiClientMock,
  resolveBackendAssetUrl: vi.fn(),
}));

import { financeApi, getApiErrorMessage, medicalApi } from '../backendApi';

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

describe('getApiErrorMessage', () => {
  it('returns the message from an object-shaped validation detail', () => {
    const error = {
      response: {
        status: 422,
        data: { detail: { field: 'phone_number', message: 'Enter a valid phone number.' } },
      },
    };

    expect(getApiErrorMessage(error)).toBe('Enter a valid phone number.');
  });
});

describe('medicalApi mutation responses', () => {
  it('does not fabricate a created record when the backend returns no record body', async () => {
    apiClientMock.request.mockResolvedValue({ data: null });

    await expect(medicalApi.createRecord({ cow: 5, diagnosis: 'Mastitis' })).resolves.toBeNull();
  });

  it('does not fabricate an updated record when the backend returns no record body', async () => {
    apiClientMock.request.mockResolvedValue({ data: null });

    await expect(medicalApi.updateRecord(12, { cow: 5, diagnosis: 'Mastitis' })).resolves.toBeNull();
  });

  it('does not fabricate a completed record when the follow-up endpoint returns no record body', async () => {
    apiClientMock.request
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });

    await expect(medicalApi.updateRecord(12, { status: 'Closed' })).resolves.toBeNull();
  });

  it('does not fabricate follow-up records when schedule or complete returns no body', async () => {
    apiClientMock.request.mockResolvedValue({ data: null });

    await expect(medicalApi.scheduleFollowUp(12, { follow_up_date: '2026-10-10' })).resolves.toBeNull();
    await expect(medicalApi.completeFollowUp(12)).resolves.toBeNull();
  });
});