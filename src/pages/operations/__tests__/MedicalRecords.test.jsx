import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findCowIdentityMatch } from '../../../lib/cowIdentity';
import MedicalRecords from '../MedicalRecords';

globalThis.React = React;
afterEach(cleanup);

const apiMocks = vi.hoisted(() => ({
  listRecords: vi.fn(),
  listCows: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../lib/backendApi', () => ({
  herdApi: { list: apiMocks.listCows },
  medicalApi: {
    listRecords: apiMocks.listRecords,
    createRecord: apiMocks.createRecord,
    updateRecord: apiMocks.updateRecord,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['medical-records', 'tenant_1', 'farm_1'], [{
    id: 12,
    cow: 'Mrembo · 005',
    date: '2026-09-23',
    reason: 'Rough coat and loss of weight and poor feeding',
    diagnosis: 'Weight Loss and Poor Body Condition',
    meds: 'Bimectin injection, Ivermectin injection',
    recommendations: 'Monitor feeding and body condition.',
    vet: 'Dr. A. Njoroge',
    status: 'Closed',
    severity: 'Low',
    followUp: '',
  }]);
  queryClient.setQueryData(['medical-records-cows', 'tenant_1', 'farm_1'], [{
    id: 5,
    tag_number: '005',
    name: 'Mrembo',
  }]);
  return render(
    <QueryClientProvider client={queryClient}>
      <MedicalRecords />
    </QueryClientProvider>,
  );
}

describe('MedicalRecords validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listRecords.mockResolvedValue([{
      id: 12,
      cow: 'Mrembo · 005',
      date: '2026-09-23',
      reason: 'Rough coat and loss of weight and poor feeding',
      diagnosis: 'Weight Loss and Poor Body Condition',
      meds: 'Bimectin injection, Ivermectin injection',
      recommendations: 'Monitor feeding and body condition.',
      vet: 'Dr. A. Njoroge',
      status: 'Closed',
      severity: 'Low',
      followUp: '',
    }]);
    apiMocks.listCows.mockResolvedValue([{ id: 5, tag_number: '005', name: 'Mrembo' }]);
    apiMocks.createRecord.mockResolvedValue({ id: 13, cow: 5, cow_name: 'Mrembo' });
    apiMocks.updateRecord.mockResolvedValue({ id: 12, cow: 5, cow_name: 'Mrembo' });
  });

  it('renders an invalid cow validation message instead of crashing', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /log new visit/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Malaika or KE-0046'), { target: { value: 'Unknown Cow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect((await screen.findAllByText('Select a registered tenant cow by tag or name from the dropdown.')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Save Record' })).toBeTruthy();
    expect(apiMocks.createRecord).not.toHaveBeenCalled();
  });

  it('blocks submission without a follow-up date when status is Follow-up Due', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /log new visit/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Malaika or KE-0046'), { target: { value: 'Mrembo · 005' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of symptoms...'), { target: { value: 'Rough coat and poor feeding' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Mastitis, Milk Fever'), { target: { value: 'Weight loss' } });
    fireEvent.change(screen.getByPlaceholderText('Name and dosage'), { target: { value: 'Bimectin injection' } });
    fireEvent.change(screen.getByPlaceholderText('Follow-up instructions...'), { target: { value: 'Monitor feeding.' } });
    fireEvent.change(screen.getByDisplayValue('Under Treatment'), { target: { value: 'Follow-up Due' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect((await screen.findAllByText('This field is required')).length).toBeGreaterThan(0);
    expect(apiMocks.createRecord).not.toHaveBeenCalled();
  });

  it('allows no follow-up date for other statuses and submits the selected severity', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /log new visit/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Malaika or KE-0046'), { target: { value: 'Mrembo · 005' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of symptoms...'), { target: { value: 'Rough coat and poor feeding' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Mastitis, Milk Fever'), { target: { value: 'Weight loss' } });
    fireEvent.change(screen.getByPlaceholderText('Name and dosage'), { target: { value: 'Bimectin injection' } });
    fireEvent.change(screen.getByPlaceholderText('Follow-up instructions...'), { target: { value: 'Monitor feeding.' } });
    fireEvent.change(screen.getByDisplayValue('Medium'), { target: { value: 'High' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await screen.findByText('Medical record saved for Mrembo · 005.');
    await waitFor(() => expect(apiMocks.createRecord).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'High',
      followUp: '',
    })));
  });

  it('does not create a local registry/detail record when a successful response has no body', async () => {
    apiMocks.createRecord.mockResolvedValue(null);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /log new visit/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Malaika or KE-0046'), { target: { value: 'Mrembo · 005' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of symptoms...'), { target: { value: 'Rough coat and poor feeding' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Mastitis, Milk Fever'), { target: { value: 'Draft-only diagnosis' } });
    fireEvent.change(screen.getByPlaceholderText('Name and dosage'), { target: { value: 'Bimectin injection' } });
    fireEvent.change(screen.getByPlaceholderText('Follow-up instructions...'), { target: { value: 'Monitor feeding.' } });
    fireEvent.change(document.querySelectorAll('input[type="date"]')[1], { target: { value: '2026-10-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect(await screen.findByText('Medical record saved for Mrembo · 005.')).toBeTruthy();
    expect(screen.queryByPlaceholderText('e.g. Malaika or KE-0046')).toBeNull();
    expect(screen.queryByText('Draft-only diagnosis')).toBeNull();
    expect(screen.queryByText('Medical Record Details')).toBeNull();
  });

  it('resolves the formatted cow label already stored on existing records', () => {
    const matchedCow = findCowIdentityMatch('Mrembo · 005', [
      { tag: '005', recordId: 5, name: 'Mrembo' },
    ]);

    expect(matchedCow).toEqual({ tag: '005', recordId: 5, name: 'Mrembo' });
  });
});
