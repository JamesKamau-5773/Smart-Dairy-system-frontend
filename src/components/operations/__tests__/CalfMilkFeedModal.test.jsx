import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalfMilkFeedModal from '../CalfMilkFeedModal';

globalThis.React = React;

const apiMocks = vi.hoisted(() => ({
  listHerd: vi.fn(),
  createMilkDisposition: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_6', farmId: 'farm_6' }),
}));

vi.mock('../../../lib/backendApi', () => ({
  getApiErrorMessage: (error, fallback) => error?.message || fallback,
  herdApi: { list: apiMocks.listHerd },
  productionApi: { createMilkDisposition: apiMocks.createMilkDisposition },
}));

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CalfMilkFeedModal isOpen onClose={vi.fn()} initialDate="2026-09-15" />
    </QueryClientProvider>
  );
}

describe('CalfMilkFeedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listHerd.mockResolvedValue([
      { id: 12, tag_number: 'C-012', name: 'Amani', current_status: 'Calf', is_active: true },
      { id: 13, tag_number: 'C-013', name: 'Retired calf', current_status: 'Calf', is_active: false },
      { id: 14, tag_number: 'C-014', name: 'Zuri', current_status: 'Heifer', is_active: true },
    ]);
    apiMocks.createMilkDisposition.mockResolvedValue({ id: 8 });
  });

  it('shows only active calves and submits the entered allocation', async () => {
    renderModal();

    expect(await screen.findByRole('option', { name: 'Amani · C-012' })).toBeTruthy();
    const calfSelect = screen.getByRole('combobox', { name: 'Calf' });
    expect(screen.queryByRole('option', { name: /Retired calf/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Zuri/ })).toBeNull();

    fireEvent.change(calfSelect, { target: { value: '12' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Milk consumed \(liters\)/ }), { target: { value: '3.5' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes (optional)' }), { target: { value: 'Morning feeding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record feeding' }));

    await waitFor(() => {
      expect(apiMocks.createMilkDisposition).toHaveBeenCalledWith({
        calfId: '12',
        liters: '3.5',
        date: '2026-09-15',
        notes: 'Morning feeding',
      });
    });
  });
});