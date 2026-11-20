// The "Milked by" picker: the backend's milker list, sent as milker_id (none = the person recording).
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FastMilkLog from '../FastMilkLog';
import { productionApi } from '../../../lib/backendApi';
import { queryClient } from '../../../providers/QueryProvider';

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { list: vi.fn().mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Milking' }]) },
    safetyApi: { activeHardlocks: vi.fn().mockResolvedValue([]) },
    productionApi: { ...actual.productionApi, createYield: vi.fn(), updateYield: vi.fn(), listMilkers: vi.fn() },
  };
});

// As the backend sends them (already only current employees); is_me is the person recording.
const STAFF = [
  { id: 3, name: 'Kiprop Langat', status: 'ACTIVE', isMe: true },
  { id: 4, name: 'Wairimu Njoroge', status: 'ACTIVE', isMe: false },
  { id: 5, name: 'Ochieng Odera', status: 'ON_LEAVE', isMe: false },
];

beforeEach(() => {
  productionApi.listMilkers.mockReset();
  productionApi.createYield.mockReset().mockResolvedValue({ id: 1 });
  productionApi.updateYield.mockReset().mockResolvedValue({ id: 9, status: 'Recorded', significant_drop: false });
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  localStorage.clear();
});

const renderForm = (props = {}) => render(
  <QueryClientProvider client={queryClient}><MemoryRouter><FastMilkLog onClose={() => {}} {...props} /></MemoryRouter></QueryClientProvider>,
);

describe('FastMilkLog milker picker', () => {
  it('lists the backend’s milkers except the recorder, and sends the chosen one as milker_id', async () => {
    productionApi.listMilkers.mockResolvedValue(STAFF);
    renderForm();
    const milker = await screen.findByLabelText('Milked by');
    expect([...milker.options].map((option) => option.textContent))
      .toEqual(['Me (the person recording)', 'Wairimu Njoroge', 'Ochieng Odera']);

    fireEvent.change(screen.getByLabelText('Select cow'), { target: { value: '57' } });
    fireEvent.change(milker, { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Save record/ }));

    await waitFor(() => expect(productionApi.createYield).toHaveBeenCalled());
    expect(productionApi.createYield.mock.calls[0][0]).toMatchObject({ cow_id: '57', amount: 12.5, milker_id: 5 });
  });

  it('sends no milker when the person recording milked', async () => {
    productionApi.listMilkers.mockResolvedValue(STAFF);
    renderForm();
    await screen.findByLabelText('Milked by');
    fireEvent.change(screen.getByLabelText('Select cow'), { target: { value: '57' } });
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Save record/ }));
    await waitFor(() => expect(productionApi.createYield).toHaveBeenCalled());
    expect(productionApi.createYield.mock.calls[0][0]).not.toHaveProperty('milker_id');
  });

  it('hides the picker when the milker list can’t be read', async () => {
    productionApi.listMilkers.mockRejectedValue({ response: { status: 403, data: {} } });
    renderForm();
    await screen.findByLabelText('Select cow');
    await waitFor(() => expect(productionApi.listMilkers).toHaveBeenCalled());
    expect(screen.queryByLabelText('Milked by')).toBeNull();
  });

  it('on edit, starts from the record’s milker and clears it with null', async () => {
    productionApi.listMilkers.mockResolvedValue(STAFF);
    const record = { id: 9, cowId: 'KE-012', cowName: 'Neema', amount: 11, session: 'Morning', date: '2026-11-19', milkerId: 4 };
    renderForm({ mode: 'edit', record });
    const milker = await screen.findByLabelText('Milked by');
    await waitFor(() => expect(milker.value).toBe('4'));
    fireEvent.change(milker, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Update record/ }));
    await waitFor(() => expect(productionApi.updateYield).toHaveBeenCalled());
    expect(productionApi.updateYield.mock.calls[0][1]).toMatchObject({ amount: 11, milker_id: null });
    await act(async () => {});
  });

  it('on edit, leaves the milker out when it didn’t change', async () => {
    productionApi.listMilkers.mockResolvedValue(STAFF);
    const record = { id: 9, cowId: 'KE-012', cowName: 'Neema', amount: 11, session: 'Morning', date: '2026-11-19', milkerId: 4 };
    renderForm({ mode: 'edit', record });
    await screen.findByLabelText('Milked by');
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Update record/ }));
    await waitFor(() => expect(productionApi.updateYield).toHaveBeenCalled());
    expect(productionApi.updateYield.mock.calls[0][1]).not.toHaveProperty('milker_id');
  });
});
