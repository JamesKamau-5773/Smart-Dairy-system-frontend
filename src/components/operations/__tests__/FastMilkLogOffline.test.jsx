import React from 'react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FastMilkLog from '../FastMilkLog';
import { productionApi } from '../../../lib/backendApi';
import { queryClient } from '../../../providers/QueryProvider';

void React;
afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
  queryClient.clear();
});

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { list: vi.fn().mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Milking' }]) },
    safetyApi: { activeHardlocks: vi.fn().mockResolvedValue([]) },
    productionApi: {
      ...actual.productionApi,
      createYield: vi.fn().mockResolvedValue({ queued: true, offline: true, queue_id: 'q1', message: 'Saved on this device and waiting to synchronize.' }),
    },
  };
});

describe('FastMilkLog when the save is queued offline', () => {
  it('sends the save while the device is offline, says it is on this phone, and adds no list row', async () => {
    const onSaveSuccess = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><FastMilkLog onSaveSuccess={onSaveSuccess} /></MemoryRouter>
      </QueryClientProvider>,
    );

    const cowSelect = await screen.findByRole('combobox');
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(cowSelect, { target: { value: '57' } });
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '12.5' } });

    // React Query's default would pause this mutation until reconnect, bypassing the queue.
    onlineManager.setOnline(false);
    fireEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(await screen.findByText('Saved on this phone')).toBeTruthy();
    expect(screen.getByText('It will be sent when you’re back online.')).toBeTruthy();
    expect(productionApi.createYield).toHaveBeenCalled();
    expect(onSaveSuccess).not.toHaveBeenCalled();
  });
});

describe('FastMilkLog drafts', () => {
  it('restores what was typed after the app closed, and Start over clears it', async () => {
    localStorage.clear();
    sessionStorage.setItem('jivu_user', JSON.stringify({ id: 7, farm_id: 'farm_1', token: 't' }));
    const renderForm = () => render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><FastMilkLog /></MemoryRouter>
      </QueryClientProvider>,
    );

    const first = renderForm();
    const cowSelect = await screen.findByRole('combobox');
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(cowSelect, { target: { value: '57' } });
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '8.5' } });
    await new Promise((resolve) => { setTimeout(resolve, 400); });
    first.unmount();

    renderForm();
    expect(await screen.findByText('Restored what you were typing before the app closed.')).toBeTruthy();
    expect(screen.getByPlaceholderText('0.0').value).toBe('8.5');

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByPlaceholderText('0.0').value).toBe('');
    expect(screen.queryByText(/Restored what you were typing/)).toBeNull();
    sessionStorage.clear();
  });
});
