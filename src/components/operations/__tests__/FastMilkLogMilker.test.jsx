// The "Milked by" picker: the farm's staff, sent as milker_id (none = the person recording).
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FastMilkLog from '../FastMilkLog';
import { hrApi, productionApi } from '../../../lib/backendApi';
import { queryClient } from '../../../providers/QueryProvider';

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { list: vi.fn().mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Milking' }]) },
    safetyApi: { activeHardlocks: vi.fn().mockResolvedValue([]) },
    hrApi: { listStaff: vi.fn() },
    productionApi: { ...actual.productionApi, createYield: vi.fn(), updateYield: vi.fn() },
  };
});

const STAFF = [
  { id: 4, name: 'Wairimu Njoroge', status: 'ACTIVE' },
  { id: 5, name: 'Ochieng Odera', status: 'ACTIVE' },
  { id: 6, name: 'Left Last Year', status: 'TERMINATED' },
];

beforeEach(() => {
  hrApi.listStaff.mockReset();
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
  it('lists the farm’s active staff, and sends the chosen one as milker_id', async () => {
    hrApi.listStaff.mockResolvedValue(STAFF);
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
    hrApi.listStaff.mockResolvedValue(STAFF);
    renderForm();
    await screen.findByLabelText('Milked by');
    fireEvent.change(screen.getByLabelText('Select cow'), { target: { value: '57' } });
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Save record/ }));
    await waitFor(() => expect(productionApi.createYield).toHaveBeenCalled());
    expect(productionApi.createYield.mock.calls[0][0]).not.toHaveProperty('milker_id');
  });

  it('hides the picker when the staff list can’t be read (roles without staff access)', async () => {
    hrApi.listStaff.mockRejectedValue({ response: { status: 403, data: {} } });
    renderForm();
    await screen.findByLabelText('Select cow');
    await waitFor(() => expect(hrApi.listStaff).toHaveBeenCalled());
    expect(screen.queryByLabelText('Milked by')).toBeNull();
  });

  it('on edit, starts from the record’s milker and clears it with null', async () => {
    hrApi.listStaff.mockResolvedValue(STAFF);
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
    hrApi.listStaff.mockResolvedValue(STAFF);
    const record = { id: 9, cowId: 'KE-012', cowName: 'Neema', amount: 11, session: 'Morning', date: '2026-11-19', milkerId: 4 };
    renderForm({ mode: 'edit', record });
    await screen.findByLabelText('Milked by');
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Update record/ }));
    await waitFor(() => expect(productionApi.updateYield).toHaveBeenCalled());
    expect(productionApi.updateYield.mock.calls[0][1]).not.toHaveProperty('milker_id');
  });
});
