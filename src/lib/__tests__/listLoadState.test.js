import { describe, expect, it } from 'vitest';
import { getListLoadState } from '../listLoadState';

describe('getListLoadState', () => {
  it.each([
    [{ status: 'pending', fetchStatus: 'fetching', data: undefined }, 'loading'],
    [{ status: 'pending', fetchStatus: 'paused', data: undefined }, 'offline'],
    [{ status: 'error', fetchStatus: 'idle', data: undefined }, 'error'],
    [{ status: 'error', fetchStatus: 'idle', data: [{ id: 1 }] }, 'stale'],
    [{ status: 'success', fetchStatus: 'idle', data: [] }, 'ready'],
    [{ status: 'success', fetchStatus: 'paused', data: [{ id: 1 }] }, 'ready'],
  ])('maps %o to %s', (query, expected) => {
    expect(getListLoadState(query)).toBe(expected);
  });
});
