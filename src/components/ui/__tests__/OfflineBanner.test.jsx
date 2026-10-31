import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import offlineQueue from '../../../lib/offlineQueue';
import OfflineBanner from '../OfflineBanner';
import OfflineQueueInspector from '../OfflineQueueInspector';

void React;

const setNavigatorOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
};

async function clearQueue() {
  for (const entry of await offlineQueue.getAll()) await offlineQueue.remove(entry.id);
}

describe('OfflineBanner', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13, token: 't' }));
    await clearQueue();
    setNavigatorOnline(true);
  });
  afterEach(async () => {
    cleanup();
    setNavigatorOnline(true);
    await clearQueue();
  });

  it('renders nothing when online with nothing waiting', async () => {
    const { container } = render(<OfflineBanner />);
    await act(async () => {});
    expect(container.textContent).toBe('');
  });

  it('explains what still works while offline, including waiting changes', async () => {
    setNavigatorOnline(false);
    await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    render(<OfflineBanner />);

    expect(await screen.findByText(/You’re offline\./)).toBeTruthy();
    expect(screen.getByText(/Payments and payroll need internet/)).toBeTruthy();
    expect(await screen.findByText(/1 saved change waiting to send/)).toBeTruthy();
  });

  it('switches to the offline message when the connection drops', async () => {
    render(<OfflineBanner />);
    await act(async () => {});
    expect(screen.queryByText(/You’re offline/)).toBeNull();

    setNavigatorOnline(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(await screen.findByText(/You’re offline\./)).toBeTruthy();
  });

  it('calls out changes the server rejected', async () => {
    const id = await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    const [entry] = (await offlineQueue.getAll()).filter((item) => item.id === id);
    const { update } = await import('../../../lib/offlineMutationStore');
    await update({ ...entry, status: 'NEEDS_ATTENTION', lastError: { message: 'Cow not found.' } });

    render(<OfflineBanner />);
    expect(await screen.findByText(/1 saved change couldn’t be sent and needs your attention/)).toBeTruthy();
  });
});

describe('OfflineQueueInspector removal', () => {
  beforeEach(async () => {
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13, token: 't' }));
    await clearQueue();
  });
  afterEach(async () => {
    cleanup();
    await clearQueue();
  });

  it('asks before removing an unsent change, and Keep leaves it queued', async () => {
    await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    render(<OfflineQueueInspector isOpen onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /remove milk production record/i }));
    expect(screen.getByText('Remove this unsent change?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await offlineQueue.getAll()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /remove milk production record/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(async () => expect(await offlineQueue.getAll()).toHaveLength(0));
  });
});
