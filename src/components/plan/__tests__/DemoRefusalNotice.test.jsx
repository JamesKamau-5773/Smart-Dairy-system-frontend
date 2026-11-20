import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoRefusalNotice from '../DemoRefusalNotice';
import apiClient from '../../../lib/apiClient';
import { useAuth } from '../../../contexts/AuthContext';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const logout = vi.fn(async () => {});

// The toaster reads the reduced-motion preference; jsdom has no matchMedia.
beforeAll(() => { window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }); });
afterAll(() => { delete window.matchMedia; });

function Where() {
  return <p>at {useLocation().pathname}</p>;
}

const renderShell = () => render(
  <MemoryRouter initialEntries={['/milk']}>
    <DemoRefusalNotice />
    <Toaster />
    <Routes><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter>,
);

// Sends a request through the real API client; the adapter stands in for the backend's answer.
const requestRefusedWith = (status, data) => apiClient.post('/milk-records', { litres: 12 }, {
  adapter: async (config) => Promise.reject(Object.assign(new Error(`HTTP ${status}`), {
    config, response: { status, data, headers: {}, config },
  })),
}).catch(() => {});

describe('demo refusals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { id: 1, is_demo: true }, logout });
  });
  afterEach(() => {
    act(() => toast.remove());
    cleanup();
  });

  it('turns a DEMO_READ_ONLY refusal from any request into one sign-up prompt', async () => {
    renderShell();
    await act(() => requestRefusedWith(403, { code: 'DEMO_READ_ONLY', error: 'raw backend text', demo: true }));

    expect(await screen.findByText('This is a demo. Create a free farm to save your own records.')).toBeTruthy();
    expect(screen.queryByText('raw backend text')).toBeNull();

    // Several refusals at once still show a single prompt.
    await act(() => requestRefusedWith(403, { code: 'DEMO_READ_ONLY' }));
    expect(screen.getAllByRole('button', { name: 'Create your free farm' })).toHaveLength(1);
  });

  it('explains features the demo leaves out (DEMO_FEATURE_UNAVAILABLE)', async () => {
    renderShell();
    await act(() => requestRefusedWith(403, { code: 'DEMO_FEATURE_UNAVAILABLE' }));
    expect(await screen.findByText('This isn’t available in the demo. Create a free farm to use it.')).toBeTruthy();
  });

  it('ignores other refusals', async () => {
    renderShell();
    await act(() => requestRefusedWith(403, { code: 'FORBIDDEN' }));
    await act(() => requestRefusedWith(500, { code: 'DEMO_READ_ONLY' }));
    expect(screen.queryByRole('button', { name: 'Create your free farm' })).toBeNull();
  });

  it('signs up from the prompt only after ending the demo session', async () => {
    renderShell();
    await act(() => requestRefusedWith(403, { code: 'DEMO_READ_ONLY' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create your free farm' }));

    expect(await screen.findByText('at /register')).toBeTruthy();
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});
