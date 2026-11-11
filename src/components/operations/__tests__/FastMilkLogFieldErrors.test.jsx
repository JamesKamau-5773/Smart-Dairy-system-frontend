// UX audit phase 6: the backend's validation shows under the milk form's inputs, and the form
// reads in Kiswahili when chosen.
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FastMilkLog from '../FastMilkLog';
import { productionApi } from '../../../lib/backendApi';
import { queryClient } from '../../../providers/QueryProvider';
import { setLocale } from '../../../i18n/locale';

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }) }));
vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { list: vi.fn().mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Milking' }]) },
    safetyApi: { activeHardlocks: vi.fn().mockResolvedValue([]) },
    productionApi: { ...actual.productionApi, createYield: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  act(() => setLocale('en'));
  localStorage.clear();
});

const renderForm = () => render(
  <QueryClientProvider client={queryClient}><MemoryRouter><FastMilkLog onClose={() => {}} /></MemoryRouter></QueryClientProvider>,
);

async function fillAndSave(saveLabel) {
  const cowSelect = await screen.findByRole('combobox');
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(cowSelect, { target: { value: '57' } });
  fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '12.5' } });
  fireEvent.click(screen.getByRole('button', { name: saveLabel }));
}

describe('FastMilkLog server field errors', () => {
  it('shows the backend’s reason under the volume, and clears it when the volume changes', async () => {
    productionApi.createYield.mockRejectedValueOnce({
      response: { status: 422, data: { code: 'VALIDATION_ERROR', fields: { amount: 'too_large' } } },
    });
    renderForm();
    await fillAndSave(/Save Record/);

    const volume = await screen.findByLabelText('Volume (Liters)');
    await waitFor(() => expect(volume.getAttribute('aria-invalid')).toBe('true'));
    expect(document.getElementById(volume.getAttribute('aria-describedby')).textContent).toBe('This is too large.');

    fireEvent.change(volume, { target: { value: '11' } });
    expect(volume.getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText('This is too large.')).toBeNull();
  });

  it('reads in Kiswahili, including the server’s field reasons', async () => {
    act(() => setLocale('sw'));
    productionApi.createYield.mockRejectedValueOnce({
      response: { status: 422, data: { code: 'VALIDATION_ERROR', fields: { milking_date: 'in_future' } } },
    });
    renderForm();
    expect(screen.getByRole('heading', { name: 'Rekodi Maziwa' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'jioni' })).toBeTruthy();

    await fillAndSave('Hifadhi Rekodi');
    expect(await screen.findByText('Tarehe hii haiwezi kuwa ya baadaye.')).toBeTruthy();
  });
});
