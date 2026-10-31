import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeSessionUser, withCurrentToken } from '../backendApi';
import { clearSession, loadSession, saveSession } from '../sessionStore';

const backendSession = {
  id: 7,
  username: 'test-user',
  name: 'Test User',
  phone_number: '254700000000',
  role: 'FARMER',
  tenant_id: 'tenant_1',
  tenant_name: 'Test Tenant',
  tenant_type: 'single',
  farm_id: 'farm_1',
  farm_name: 'Test Farm',
  access_token: 'valid-token',
  available_farms: [],
};

describe('authentication session handling', () => {
  beforeEach(async () => {
    await clearSession();
    sessionStorage.clear();
  });

  it('requires a non-empty token in a successful backend session', () => {
    expect(() => normalizeSessionUser({ ...backendSession, access_token: '' })).toThrow(
      'Authentication response is missing an access token.',
    );
    expect(() => normalizeSessionUser({ id: 7, username: 'test-user' })).toThrow(
      'Authentication response is missing an access token.',
    );
  });

  it('rejects saved sessions that cannot authenticate', async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7 }));
    await expect(loadSession()).resolves.toBeNull();
  });

  it('preserves the token returned by the backend', async () => {
    const saved = await saveSession(normalizeSessionUser(backendSession));

    expect(saved.token).toBe('valid-token');
    expect(await loadSession()).toMatchObject({ token: 'valid-token' });
  });
});

describe('verifying a saved session with /auth/me', () => {
  const meResponse = { ...backendSession };
  delete meResponse.access_token;

  it('keeps the current token when the response has none', () => {
    expect(normalizeSessionUser(withCurrentToken(meResponse, 'current-token'))).toMatchObject({ id: 7, token: 'current-token' });
  });

  it('prefers a token the server does return', () => {
    expect(withCurrentToken(backendSession, 'current-token')).toBe(backendSession);
  });

  it('still rejects a response when there is no token anywhere', () => {
    expect(() => normalizeSessionUser(withCurrentToken(meResponse, null))).toThrow('missing an access token');
  });
});
