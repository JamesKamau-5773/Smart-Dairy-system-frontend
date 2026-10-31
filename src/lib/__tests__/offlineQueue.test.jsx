import { beforeEach, describe, expect, it, vi } from 'vitest';
import offlineQueue from '../offlineQueue';
import apiClient from '../apiClient';

describe('offlineQueue (memory/localforage fallback) enqueue & flush', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({
      id: 7,
      tenant_id: 11,
      farm_id: 13,
    }));
    const all = await offlineQueue.getAll();
    for (const e of all) {
      await offlineQueue.remove(e.id);
    }
  });

  it('enqueue then flush removes item on successful post', async () => {
    const payload = { cowId: 'C-TEST-1', volume: 5.5, session: 'morning', milkingDate: '2026-06-02' };
    const id = await offlineQueue.enqueue(payload);
    let items = await offlineQueue.getAll();
    expect(items.length).toBeGreaterThanOrEqual(1);

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { ok: true } });

    // capture flushing events
    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener('offlineQueue:flushing', handler);

    await offlineQueue.flush();

    items = await offlineQueue.getAll();
    expect(items.length).toBe(0);

    // flushing should have toggled true then false
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]).toBe(true);
    expect(events[events.length - 1]).toBe(false);

    requestSpy.mockRestore();
    window.removeEventListener('offlineQueue:flushing', handler);
  });

  it('normalizes camelCase yield payloads before posting', async () => {
    const payload = { cowId: 'C-TEST-3', volume: 7.25, session: 'evening', milkingDate: '2026-06-04' };
    await offlineQueue.enqueue(payload);

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { ok: true } });

    await offlineQueue.flush();

    expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: '/production/yield',
      data: expect.objectContaining({
        cow_id: 'C-TEST-3',
        amount: 7.25,
        session: 'evening',
        milkingDate: '2026-06-04',
      }),
      skipOfflineQueue: true,
    }));

    requestSpy.mockRestore();
  });

  it('gives separate queued milk logs distinct idempotency keys', async () => {
    const payload = { cowId: 'C-TEST-4', volume: 5, session: 'morning', milkingDate: '2026-06-05' };
    await offlineQueue.enqueue(payload);
    await offlineQueue.enqueue({ ...payload, volume: 6 });

    const entries = await offlineQueue.getAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].request.headers['Idempotency-Key'])
      .not.toBe(entries[1].request.headers['Idempotency-Key']);
  });

  it('keeps business conflicts for user review', async () => {
    const payload = { cowId: 'C-TEST-2', volume: 3.2, session: 'evening', milkingDate: '2026-06-03' };
    const id = await offlineQueue.enqueue(payload);

    const err = new Error('Conflict');
    err.response = { status: 409 };
    const requestSpy = vi.spyOn(apiClient, 'request').mockRejectedValue(err);

    await offlineQueue.flush();

    const items = await offlineQueue.getAll();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id,
      status: 'NEEDS_ATTENTION',
      lastError: { status: 409 },
    });

    requestSpy.mockRestore();
  });
});

describe('offlineQueue flush scheduling', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13 }));
    for (const entry of await offlineQueue.getAll()) await offlineQueue.remove(entry.id);
    vi.restoreAllMocks();
  });

  it('shares one run when flush is requested several times at once', async () => {
    await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { ok: true } });

    const [first, second, third] = await Promise.all([offlineQueue.flush(), offlineQueue.flush(), offlineQueue.flush()]);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(first.synced).toBe(1);
  });

  it('does not signal syncing when nothing is due', async () => {
    const events = [];
    const handler = (event) => events.push(event.detail);
    window.addEventListener('offlineQueue:flushing', handler);
    try {
      expect(await offlineQueue.flush()).toEqual({ synced: 0, pending: 0 });
      expect(events).toEqual([]);
    } finally {
      window.removeEventListener('offlineQueue:flushing', handler);
    }
  });
});
