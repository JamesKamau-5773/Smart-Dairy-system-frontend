import { beforeEach, describe, expect, it } from 'vitest';
import offlineQueue from '../offlineQueue';

describe('offlineQueue.enqueue idempotency key', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13 }));
    for (const entry of await offlineQueue.getAll()) {
      await offlineQueue.remove(entry.id);
    }
  });

  const milkLog = { cow_id: '57', amount: 12.5, session: 'morning', milking_date: '2026-11-08' };

  it('keeps the key of a submission that may already have reached the server', async () => {
    const id = await offlineQueue.enqueue(milkLog, { idempotencyKey: 'web:already-sent' });
    const entry = (await offlineQueue.getAll()).find((item) => item.id === id);
    expect(entry.request.headers['Idempotency-Key']).toBe('web:already-sent');
  });

  it('gives each new queued log its own key when none is passed', async () => {
    await offlineQueue.enqueue(milkLog);
    await offlineQueue.enqueue(milkLog);
    const keys = (await offlineQueue.getAll()).map((item) => item.request.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
