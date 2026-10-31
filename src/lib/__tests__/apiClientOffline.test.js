import { beforeEach, describe, expect, it } from 'vitest';
import apiClient from '../apiClient';
import offlineQueue from '../offlineQueue';
import { isQueuedOffline } from '../offlinePolicy';

function rejectRequest(config, error) {
  return Promise.reject(Object.assign(error, { config, request: {} }));
}

describe('apiClient offline transport', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({
      id: 7,
      tenant_id: 11,
      farm_id: 13,
      token: 'test-token',
    }));
    const entries = await offlineQueue.getAll();
    await Promise.all(entries.map((entry) => offlineQueue.remove(entry.id)));
  });

  it('queues replayable JSON mutations after a network failure', async () => {
    const response = await apiClient.post('/herd', { tag_number: 'C-101' }, {
      adapter: (config) => rejectRequest(
        config,
        Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }),
      ),
    });

    expect(response.status).toBe(202);
    expect(response.data).toMatchObject({ queued: true, offline: true });

    const entries = await offlineQueue.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].request).toMatchObject({
      method: 'POST',
      url: '/herd',
      data: { tag_number: 'C-101' },
    });
    expect(entries[0].request.headers['Idempotency-Key']).toMatch(/^web:/);
  });

  it('does not queue server-side validation failures', async () => {
    await expect(apiClient.post('/herd', {}, {
      adapter: (config) => rejectRequest(
        config,
        Object.assign(new Error('Bad Request'), {
          response: { status: 400, data: { message: 'tag_number is required' } },
        }),
      ),
    })).rejects.toMatchObject({ response: { status: 400 } });

    expect(await offlineQueue.getAll()).toHaveLength(0);
  });
});
describe('offline replay policy for money actions', () => {
  const offlineFailure = (config) => rejectRequest(
    config,
    Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }),
  );

  beforeEach(() => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13, token: 'test-token' }));
  });

  it.each([
    ['/hr/payroll/runs/4/pay'],
    ['/hr/payroll/runs/4/finalize'],
    ['/hr/payroll/runs'],
    ['/finance/transactions/9/void-and-replace'],
    ['/finance/customers/3/payments'],
  ])('fails %s instead of queueing it', async (url) => {
    await expect(apiClient.post(url, {}, { adapter: offlineFailure })).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    expect(await offlineQueue.getAll()).toHaveLength(0);
  });

  it('queues ledger entries and marks the response as queued', async () => {
    const response = await apiClient.post('/finance/ledger', { amount: 500 }, { adapter: offlineFailure });

    expect(isQueuedOffline(response.data)).toBe(true);
    expect(isQueuedOffline({ id: 1, amount: 500 })).toBe(false);
    await Promise.all((await offlineQueue.getAll()).map((entry) => offlineQueue.remove(entry.id)));
  });
});
