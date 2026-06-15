import { beforeEach, describe, expect, it, vi } from 'vitest';
import offlineQueue from '../offlineQueue';
import apiClient from '../apiClient';

describe('offlineQueue (memory/localforage fallback) enqueue & flush', () => {
  beforeEach(async () => {
    // try to clear any existing items
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

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { ok: true } });

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

    postSpy.mockRestore();
    window.removeEventListener('offlineQueue:flushing', handler);
  });

  it('removes item when server responds with 409 (duplicate)', async () => {
    const payload = { cowId: 'C-TEST-2', volume: 3.2, session: 'evening', milkingDate: '2026-06-03' };
    const id = await offlineQueue.enqueue(payload);
    let items = await offlineQueue.getAll();
    expect(items.length).toBeGreaterThanOrEqual(1);

    const err = new Error('Conflict');
    err.response = { status: 409 };
    const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValue(err);

    await offlineQueue.flush();

    items = await offlineQueue.getAll();
    expect(items.length).toBe(0);

    postSpy.mockRestore();
  });
});
