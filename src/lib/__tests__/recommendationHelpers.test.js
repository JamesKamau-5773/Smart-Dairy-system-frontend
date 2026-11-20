import { describe, expect, it, vi } from 'vitest';
import { offlineFailureMessage } from '../offlinePolicy';
import { getMpesaCodeError } from '../validation';
import offlineQueue from '../offlineQueue';
import apiClient from '../apiClient';

describe('offlineFailureMessage', () => {
  it('says plainly that nothing happened when the request never reached the server', () => {
    expect(offlineFailureMessage({ code: 'ERR_NETWORK' }, 'Nobody was paid and nothing was changed.'))
      .toBe('No internet connection. Nobody was paid and nothing was changed. Try again when you’re back online.');
  });

  it('defers to the server message when the server answered', () => {
    expect(offlineFailureMessage({ response: { status: 422 } }, 'x')).toBeNull();
  });
});

describe('getMpesaCodeError', () => {
  it.each(['SBK7X2Y9QZ', ' sbk7x2y9qz ', ''])('accepts %j', (value) => {
    expect(getMpesaCodeError(value)).toBeNull();
  });

  it.each(['abc', 'SBK7X2Y9Q', 'SBK7X2Y9QZ1', 'SBK7-2Y9QZ'])('rejects %j with a fix hint', (value) => {
    expect(getMpesaCodeError(value)).toMatch(/10 letters and numbers/);
  });
});

describe('offline queue and expired sessions', () => {
  it('keeps a change pending (not "needs attention") when the server says the session ended', async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13 }));
    for (const entry of await offlineQueue.getAll()) await offlineQueue.remove(entry.id);
    await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    vi.spyOn(apiClient, 'request').mockRejectedValue(Object.assign(new Error('Unauthorized'), { response: { status: 401, data: {} } }));

    await offlineQueue.flush();
    const [entry] = await offlineQueue.getAll();

    expect(entry.status).toBe('PENDING');
    vi.restoreAllMocks();
    await offlineQueue.remove(entry.id);
  });
});
