import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stands in for the network under the real API clients, so the request itself is checked.
const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('../httpClientConfig', async (importOriginal) => {
  const actual = await importOriginal();
  return { httpClientConfig: { ...actual.httpClientConfig, adapter } };
});

const { authApi } = await import('../backendApi');

const ok = (data) => async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

describe('authApi.demo (backend docs/demo-account.md)', () => {
  beforeEach(() => adapter.mockReset());

  it('POSTs /auth/demo with no body, sending cookies like login', async () => {
    adapter.mockImplementation(ok({ access_token: 'demo-jwt', is_demo: true, read_only: true, tenant_id: 'tenant_7', farm_id: 'farm_9', role: 'FARMER' }));

    const user = await authApi.demo();

    const [config] = adapter.mock.calls[0];
    expect(config.method).toBe('post');
    expect(config.url).toBe('/auth/demo');
    expect(config.data).toBeUndefined();
    expect(config.withCredentials).toBe(true);
    // The session keeps the backend's own demo flags; nothing is added on this side.
    expect(user).toMatchObject({ token: 'demo-jwt', is_demo: true, read_only: true, tenant_id: 'tenant_7', farm_id: 'farm_9' });
  });
});
