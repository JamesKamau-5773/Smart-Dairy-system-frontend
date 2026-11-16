import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FeedFormulation from '../FeedFormulation';

void React;
afterEach(cleanup);

const nutrition = vi.hoisted(() => ({
  listMixerIngredients: vi.fn(), autoSaveRecipe: vi.fn(), calculateNutrition: vi.fn(), formulateRecipe: vi.fn(),
  getFeedingPlanByGroup: vi.fn(), listFeedingGroupProfiles: vi.fn(), suggestedMix: vi.fn(),
  updateFeedingGroupProfile: vi.fn(), updateRecipe: vi.fn(),
}));
const inventory = vi.hoisted(() => ({ listItems: vi.fn(), applyDataFix: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), nutritionApi: nutrition, inventoryApi: inventory }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const feedItem = (id, name, percentage) => ({
  id, name, category: 'Bulk Feed', allowed_mixers: 'dairy_meal', protein_grams_per_kg: 200, cost_per_kg: 40,
  currentStock: 500, unit: 'kg', is_active: true, data_warnings: [], percentage,
});

const renderPlanner = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><FeedFormulation /></MemoryRouter>
  </QueryClientProvider>,
);

const shareInput = (name) => screen.findByLabelText(`${name} percentage`);

describe('FeedFormulation save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inventory.listItems.mockResolvedValue([feedItem(1, 'Maize germ'), feedItem(2, 'Cotton cake')]);
    nutrition.listMixerIngredients.mockResolvedValue([{ ingredient_id: 1, percentage: 60 }, { ingredient_id: 2, percentage: 40 }]);
    nutrition.getFeedingPlanByGroup.mockResolvedValue({ groups: [], totals: {} });
    nutrition.listFeedingGroupProfiles.mockResolvedValue([]);
    nutrition.suggestedMix.mockResolvedValue({});
    nutrition.autoSaveRecipe.mockResolvedValue({ recipe_id: 9, status: 'ADOPTED' });
  });

  it('blocks saving shares that don’t add up to 100% and says why, instead of rescaling them', async () => {
    renderPlanner();
    fireEvent.change(await shareInput('Maize germ'), { target: { value: '50' } });

    const save = screen.getByRole('button', { name: /Save as current feed mix/ });
    expect(save.disabled).toBe(true);
    expect(screen.getAllByText('Shares add up to 90%. Change them to exactly 100% first.').length).toBeGreaterThan(0);
    expect(nutrition.autoSaveRecipe).not.toHaveBeenCalled();
  });

  it('confirms a save and sends the chosen group and measurements', async () => {
    renderPlanner();
    await shareInput('Maize germ');
    fireEvent.change(screen.getByLabelText('Use this mix for'), { target: { value: 'lactating' } });
    fireEvent.change(screen.getByLabelText('Concentrate per cow per day (kg)'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /Save as current feed mix/ }));

    await waitFor(() => expect(nutrition.autoSaveRecipe).toHaveBeenCalledWith(expect.objectContaining({
      feeding_group: 'lactating',
      quantity_basis: 'concentrate',
      concentrate_kg_per_head_day: 4,
      adjusted_ingredients: [expect.objectContaining({ ingredient_id: 1, percentage: 60 }), expect.objectContaining({ ingredient_id: 2, percentage: 40 })],
    })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Mix saved as the current feed mix.'));
  });

  it('shows why a save failed instead of only logging it', async () => {
    nutrition.autoSaveRecipe.mockRejectedValue(Object.assign(new Error('400'), {
      response: { status: 400, data: { code: 'VALIDATION_ERROR', error: 'Send both bulk_density_kg_per_litre and bucket_volume_litres.' }, headers: {} },
    }));
    renderPlanner();
    await shareInput('Maize germ');
    fireEvent.click(screen.getByRole('button', { name: /Save as current feed mix/ }));

    expect(await screen.findByText(/The mix was not saved\. Send both bulk_density/)).toBeTruthy();
  });

  it('lists suspect ingredients first when the protein goal can’t be reached', async () => {
    nutrition.formulateRecipe.mockRejectedValue(Object.assign(new Error('422'), {
      response: {
        status: 422,
        data: {
          code: 'UNPROCESSABLE', error: 'Target protein cannot be reached.', hint: 'Add a higher-protein ingredient.',
          suspect_ingredients: [{ ingredient_id: 2, name: 'Cotton cake', warnings: [{ code: 'PROTEIN_LIKELY_PERCENT', field: 'protein_grams_per_kg', value: 30, suggested_value: 300, message: 'Cotton cake has 30 g/kg protein.' }] }],
        },
        headers: {},
      },
    }));
    inventory.applyDataFix.mockResolvedValue({ id: 2 });
    renderPlanner();
    await shareInput('Maize germ');
    fireEvent.click(screen.getByRole('button', { name: /Auto-adjust feed shares/ }));

    expect(await screen.findByText('These ingredients may have wrong nutrition values')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Apply fix/ }));
    await waitFor(() => expect(inventory.applyDataFix).toHaveBeenCalledWith(2, 'PROTEIN_LIKELY_PERCENT'));
  });
});
