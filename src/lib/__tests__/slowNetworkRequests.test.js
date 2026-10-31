import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../apiClient';
import { herdApi, medicalApi } from '../backendApi';

afterEach(() => vi.restoreAllMocks());

describe('alias fallback on weak connections', () => {
  it('does not try the alternative URL when the request never reached the server', async () => {
    const request = vi.spyOn(apiClient, 'request').mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    await expect(medicalApi.listRecords()).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('still tries the alternative URL when the first route does not exist', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { response: { status: 404 } }))
      .mockResolvedValueOnce({ data: [] });

    await expect(medicalApi.listRecords()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].url).toBe('/medical/records');
  });
});

describe('photo upload', () => {
  it('reports real upload progress and allows longer than the default timeout', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 5, tag_number: '005', photo_url: '/uploads/5.jpg' } });
    const onProgress = vi.fn();

    await herdApi.uploadPhoto(5, new File(['x'], 'cow.jpg', { type: 'image/jpeg' }), { onProgress });

    const config = post.mock.calls[0][2];
    expect(config.timeout).toBeGreaterThanOrEqual(60 * 1000);
    config.onUploadProgress({ loaded: 30, total: 120 });
    config.onUploadProgress({ loaded: 120, total: 120 });
    expect(onProgress.mock.calls).toEqual([[25], [100]]);
  });
});
