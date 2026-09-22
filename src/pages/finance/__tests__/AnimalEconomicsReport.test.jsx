import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AnimalEconomicsReport from '../AnimalEconomicsReport';
import { herdApi, reportsApi } from '../../../lib/backendApi';

vi.mock('../../../lib/backendApi', () => ({
  herdApi: { list: vi.fn() },
  reportsApi: { getAnimalEconomics: vi.fn() },
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant-1', farmId: 'farm-1' }),
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: queryClient }, createElement(MemoryRouter, null, ui))
  );
}

describe('AnimalEconomicsReport', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    herdApi.list.mockResolvedValue([{ id: 'cow-1', tag_number: 'A-1', name: 'Bella' }]);
    reportsApi.getAnimalEconomics.mockResolvedValue({
      animal: { id: 'cow-1', tag_number: 'A-1', name: 'Bella', first_calving_date: '2025-03-10' },
      rearing_cost: { amount_kes: 25000 },
      lifetime_milk_contribution: {
        amount_kes: 40000,
        saleable_milk_liters: 2200,
        allocated_milk_revenue_kes: 50000,
        post_calving_cost_kes: 10000,
      },
      lifetime_net_contribution_kes: 15000,
      costs_by_type_kes: { feed: 18000, health: 7000 },
      data_quality: {
        attribution_quality: 'high_confidence',
        cost_attribution: 'direct_records',
        milk_revenue_attribution: 'daily_output_share',
        first_calving_recorded: true,
        unpriced_saleable_liters: 0,
      },
    });
  });

  it('shows a plain-language, actionable animal profit report', async () => {
    renderWithClient(createElement(AnimalEconomicsReport));

    expect(screen.getByText('Cost to Raise vs. Total Earnings')).toBeTruthy();
    expect(screen.getByText('Choose an animal to see its costs and profit.')).toBeTruthy();

    await waitFor(() => expect(screen.getByRole('option', { name: /Bella/ })).toBeTruthy());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cow-1' } });

    await waitFor(() => {
      expect(reportsApi.getAnimalEconomics).toHaveBeenCalledWith('cow-1');
      expect(screen.getByText('Total Profit (Income minus Costs)')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Cost to Raise (Before Calving)' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Total Milk Income' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Total Profit (Income minus Costs)' })).toBeTruthy();
      expect(screen.getByLabelText('Animal summary').textContent).toContain('profit after recorded costs');
      expect(screen.getByText('Record Completeness')).toBeTruthy();
    });
  });

  it('links incomplete records directly to the calving form', async () => {
    reportsApi.getAnimalEconomics.mockResolvedValueOnce({
      animal: { id: 'cow-1', tag_number: 'A-1', name: 'Bella', first_calving_date: null },
      rearing_cost: { amount_kes: 0 },
      lifetime_milk_contribution: {
        amount_kes: 0,
        saleable_milk_liters: 0,
        allocated_milk_revenue_kes: 0,
        post_calving_cost_kes: 0,
      },
      lifetime_net_contribution_kes: 0,
      costs_by_type_kes: {},
      data_quality: {
        attribution_quality: 'INCOMPLETE',
        cost_attribution: null,
        milk_revenue_attribution: null,
        first_calving_recorded: false,
        unpriced_saleable_liters: 0,
      },
    });

    renderWithClient(createElement(AnimalEconomicsReport));
    await waitFor(() => expect(screen.getByRole('option', { name: /Bella/ })).toBeTruthy());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cow-1' } });

    const alertLink = await screen.findByRole('link', {
      name: 'Missing first calving date. Click here to add it to calculate exact costs.',
    });
    expect(alertLink.getAttribute('href')).toBe('/operations/animal/cow-1?action=calving');
    expect(screen.getByText('Missing Data')).toBeTruthy();
  });
});