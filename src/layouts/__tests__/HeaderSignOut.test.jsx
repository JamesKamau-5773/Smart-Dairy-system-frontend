import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import offlineQueue from '../../lib/offlineQueue';

void React;

const logout = vi.fn().mockResolvedValue(undefined);
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 7, name: 'Wanjiru', role: 'FARMER' }, logout }),
}));
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ activeFarm: { name: "Kamau's Farm" } }) }));

async function clearQueue() {
  for (const entry of await offlineQueue.getAll()) await offlineQueue.remove(entry.id);
}

const openMenuAndSignOut = () => {
  fireEvent.click(screen.getByRole('button', { name: /Wanjiru/i }));
  fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
};

describe('signing out with unsent changes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, tenant_id: 11, farm_id: 13, token: 't' }));
    await clearQueue();
  });
  afterEach(async () => {
    cleanup();
    await clearQueue();
  });

  it('signs out straight away when nothing is waiting', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    openMenuAndSignOut();
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Changes not sent yet')).toBeNull();
  });

  it('warns first, lets the farmer stay signed in, or sign out anyway', async () => {
    await offlineQueue.enqueue({ cowId: 'C-1', volume: 4, session: 'morning', milkingDate: '2026-06-02' });
    vi.spyOn(offlineQueue, 'flush').mockResolvedValue({ synced: 0, pending: 1 });
    render(<MemoryRouter><Header /></MemoryRouter>);

    openMenuAndSignOut();
    expect(await screen.findByText('Changes not sent yet')).toBeTruthy();
    expect(screen.getAllByText(/1 change saved on this phone hasn’t been sent yet/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    await waitFor(() => expect(screen.queryByText('Changes not sent yet')).toBeNull());
    expect(logout).not.toHaveBeenCalled();

    openMenuAndSignOut();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out anyway' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    vi.restoreAllMocks();
  });
});
