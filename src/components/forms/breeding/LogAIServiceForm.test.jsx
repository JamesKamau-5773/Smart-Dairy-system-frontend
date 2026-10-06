import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LogAIServiceForm from './LogAIServiceForm';

globalThis.React = React;

const mocks = vi.hoisted(() => ({
  createLog: vi.fn(),
  updateLog: vi.fn(),
  uploadCertificate: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../lib/backendApi', () => ({
  breedingApi: {
    createLog: mocks.createLog,
    updateLog: mocks.updateLog,
    uploadCertificate: mocks.uploadCertificate,
  },
}));

vi.mock('../../../lib/audit', () => ({
  createAuditEntry: vi.fn((entry) => entry),
  logToAuditTrail: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  document.body.innerHTML = '';
});

function renderForm(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LogAIServiceForm
        herdOptions={[{
          id: '46',
          recordId: '46',
          tagNumber: 'COWBR001',
          name: 'Malaika',
          display: 'Malaika · COWBR001',
        }]}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('LogAIServiceForm edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateLog.mockResolvedValue({
      id: 9,
      cow_id: 46,
      external_sire_code: 'S-001',
      provided_by: 'VET',
      insemination_date: '2026-09-15',
      status: 'Pending',
    });
  });

  it('prefills record data and updates the existing log', async () => {
    const onSuccess = vi.fn();
    const { container } = renderForm({
      onSuccess,
      initialData: {
        id: 9,
        cowId: 'Malaika · COWBR001',
        aiDate: '2026-09-15',
        aiTime: '08:30',
        sireCode: 'S-001',
        semenSource: 'vet_provided',
        technician: 'Dr. Njeri',
        serviceFee: 1500,
        isRepeatService: true,
      },
    });

    expect(screen.getByPlaceholderText('e.g. Dr. Njeri').value).toBe('Dr. Njeri');
    expect(container.querySelector('input[type="date"]').value).toBe('2026-09-15');
    expect(screen.getByRole('button', { name: 'Update Service' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Update Service' }));

    await waitFor(() => expect(mocks.updateLog).toHaveBeenCalled());
    expect(mocks.updateLog).toHaveBeenCalledWith(9, expect.objectContaining({
      cow_id: '46',
      insemination_date: '2026-09-15',
      insemination_time: '08:30',
      semen_id: 'S-001',
      provided_by: 'VET',
      service_fee: 1500,
      is_repeat_service: true,
    }));
    expect(mocks.createLog).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), expect.stringContaining('Updated AI service'));
  });
});