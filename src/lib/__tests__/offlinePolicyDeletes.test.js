import { describe, expect, it } from 'vitest';
import { isReplayableMutation, offlineFailureMessage } from '../offlinePolicy';

const request = (method, url) => ({ method, url, headers: {} });

describe('deleting a cow, customer or stock item needs a connection', () => {
  it.each([
    ['/herd/57'],
    ['/customers/7'],
    ['/finance/customers/7'],
    ['/inventory/items/34'],
  ])('DELETE %s is not queued offline', (url) => {
    expect(isReplayableMutation(request('delete', url))).toBe(false);
  });

  it('still queues edits to the same records', () => {
    expect(isReplayableMutation(request('patch', '/herd/57'))).toBe(true);
    expect(isReplayableMutation(request('put', '/inventory/items/34'))).toBe(true);
  });

  it('still queues other deletes (e.g. a milk record)', () => {
    expect(isReplayableMutation(request('delete', '/production/yield/9'))).toBe(true);
  });

  it('tells the farmer nothing was deleted when there was no connection', () => {
    expect(offlineFailureMessage({ code: 'ERR_NETWORK' }, 'Neema wasn’t deleted.'))
      .toBe('No internet connection. Neema wasn’t deleted. Try again when you’re back online.');
    expect(offlineFailureMessage({ response: { status: 500 } }, 'x')).toBeNull();
  });
});
