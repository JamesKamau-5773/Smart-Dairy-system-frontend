import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoBanner from '../DemoBanner';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi } from '../../../lib/backendApi';
import { SESSION_EXPIRED_EVENT } from '../../../lib/sessionEvents';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, authApi: { ...actual.authApi, me: vi.fn() } };
});

const NOW = Date.parse('2026-11-13T10:00:00Z');
const inSeconds = (seconds) => new Date(NOW + seconds * 1000).toISOString();

// The toaster reads the reduced-motion preference; jsdom has no matchMedia.
beforeAll(() => { window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }); });
afterAll(() => { delete window.matchMedia; });

const renderDemo = (sessionExpiresAt) => {
  useAuth.mockReturnValue({ currentUser: { id: 1, is_demo: true, session_expires_at: sessionExpiresAt }, logout: vi.fn() });
  return render(<MemoryRouter><DemoBanner /><Toaster /></MemoryRouter>);
};
const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('demo time left', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only the clock and the countdown's interval are faked; the toaster keeps real timeouts.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    act(() => toast.remove());
    cleanup();
    vi.useRealTimers();
  });

  it('counts down in minutes to the backend’s session_expires_at', () => {
    renderDemo(inSeconds(45 * 60));
    expect(screen.getByText('Demo ends in 45 min')).toBeTruthy();

    tick(60_000);
    expect(screen.getByText('Demo ends in 44 min')).toBeTruthy();
  });

  it('shows minutes and seconds near the end and warns once, with a way to sign up', async () => {
    renderDemo(inSeconds(5 * 60 + 2));
    expect(screen.queryByText(/Your demo ends in/)).toBeNull();

    tick(3_000);
    expect(screen.getByText('Demo ends in 4:59')).toBeTruthy();
    expect(await screen.findByText('Your demo ends in 5 minutes. Create a free farm to keep your own records.')).toBeTruthy();

    tick(60_000);
    expect(screen.getByText('Demo ends in 3:59')).toBeTruthy();
    expect(screen.getAllByText(/Your demo ends in/)).toHaveLength(1);
  });

  it('asks the server at zero and shows the ended sheet only when it confirms (401)', async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    authApi.me.mockRejectedValue(Object.assign(new Error('HTTP 401'), { response: { status: 401 } }));
    renderDemo(inSeconds(2));

    tick(2_000);
    await act(async () => {});

    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it('keeps the demo open when the server says the session is still valid', async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    authApi.me.mockResolvedValue({ id: 1, is_demo: true });
    renderDemo(inSeconds(0));
    await act(async () => {});

    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it.each([undefined, null, ''])('shows no time left when the backend sends %s', (value) => {
    renderDemo(value);
    expect(screen.getByText(/You are exploring a demo farm/)).toBeTruthy();
    expect(screen.queryByText(/Demo ends in/)).toBeNull();
  });
});
