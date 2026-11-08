import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AlertBanner from '../../ui/AlertBanner';
import CurrentMixCard from '../CurrentMixCard';
import CreateBatchModal from '../CreateBatchModal';
import RecipeBuilder from '../../../pages/nutrition/RecipeBuilder';
import FarmSwitcher from '../../../layouts/FarmSwitcher';

void React;
afterEach(cleanup);

const tenant = vi.hoisted(() => ({ value: { tenantId: 't1', farmId: 'f1' } }));
const api = vi.hoisted(() => ({ listMixerIngredients: vi.fn(), suggestedBatchSize: vi.fn(), calculateNutrition: vi.fn(), createBatch: vi.fn() }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => tenant.value }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), nutritionApi: api }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const withQuery = (ui) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
);

describe('AlertBanner', () => {
  it('no longer prints a raw type tag like WARN before the title', () => {
    render(<AlertBanner type="warning" title="Check stock" message="Two items are low." />);
    expect(screen.getByText('Check stock')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/WARN|—/);
  });
});

describe('CurrentMixCard', () => {
  const mix = { batchId: 1, name: 'Mix', mixedOn: '2026-11-02', totalWeight: 25, consumedWeight: 24, remainingWeight: 1, dailyFeedingRate: 0 };

  it('explains why Record feeding is disabled', () => {
    render(<CurrentMixCard mix={mix} onRecordConsumption={vi.fn()} />);
    expect(screen.getByText('Choose the animal group first.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Animal feeding group'), { target: { value: 'dry' } });
    fireEvent.change(screen.getByLabelText('Feed used today (kg)'), { target: { value: '3' } });
    expect(screen.getByText('Only 1 kg left in this batch.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Record feeding/ }).disabled).toBe(true);
  });
});

describe('RecipeBuilder', () => {
  const ingredients = [
    { id: '1', ingredientId: 1, name: 'Maize germ', percentage: 60, proteinContent: 10, pricePerKg: 30 },
    { id: '2', ingredientId: 2, name: 'Sunflower Cake', percentage: 30, proteinContent: 3, pricePerKg: 40 },
  ];

  it('shows a share total that doesn’t add up, and the row’s data warning', () => {
    render(
      <RecipeBuilder
        recipeType="dairy_meal"
        ingredients={ingredients}
        onIngredientsChange={vi.fn()}
        ingredientWarnings={{ 2: [{ code: 'PROTEIN_LIKELY_PERCENT', field: 'protein_grams_per_kg', message: 'Sunflower Cake has 30 g/kg protein.' }] }}
      />,
    );
    expect(screen.getByText('Shares add up to 90%')).toBeTruthy();
    expect(screen.getByText('Sunflower Cake has 30 g/kg protein.')).toBeTruthy();
  });
});

describe('CreateBatchModal suggested size', () => {
  const ingredients = [
    { ingredientId: 1, name: 'Maize germ', percentage: 50, availableStock: 20 },
    { ingredientId: 2, name: 'Cotton cake', percentage: 50, availableStock: 100 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.listMixerIngredients.mockResolvedValue([]);
    api.calculateNutrition.mockResolvedValue({ average_protein_percent: 16, total_protein_grams: 6000, ingredients: [] });
  });

  it('pre-fills the size from the suggestion, capped to what stock allows', async () => {
    api.suggestedBatchSize.mockResolvedValue({ suggested_batch_kg: 60, days: 7, reason: null, max_batch_kg: 40, limiting_ingredient: { name: 'Maize germ' } });
    render(withQuery(<CreateBatchModal isOpen onClose={vi.fn()} recipeType="dairy_meal" ingredients={ingredients} initialMixSize={500} />));

    // The backend says Maize germ limits the batch to 40 kg.
    expect(await screen.findByText(/Your stock only covers 40 kg \(Maize germ runs out first\)/)).toBeTruthy();
    expect(screen.getByLabelText('Total Batch Size (KG)').value).toBe('40');
    expect(api.suggestedBatchSize).toHaveBeenCalledWith('dairy_meal', 7);
  });

  it('shows the backend’s reason when there’s nothing to suggest', async () => {
    api.suggestedBatchSize.mockResolvedValue({ suggested_batch_kg: 0, reason: 'There’s enough in store for 7 days.' });
    render(withQuery(<CreateBatchModal isOpen onClose={vi.fn()} recipeType="dairy_meal" ingredients={ingredients} initialMixSize={30} />));
    expect(await screen.findByText('There’s enough in store for 7 days.')).toBeTruthy();
  });
});

describe('FarmSwitcher', () => {
  it('always lists the active farm, even when it’s missing from the farm list', () => {
    tenant.value = {
      isCooperative: true,
      activeFarm: { id: 3, name: 'Kamau Dairy' },
      availableFarms: [{ id: '5', farm_name: 'Bahati' }],
      switchFarm: vi.fn(),
      isSwitching: false,
    };
    render(<FarmSwitcher />);
    const select = screen.getByLabelText('Active Workspace');
    expect(select.value).toBe('3');
    expect([...select.options].map((option) => option.textContent)).toEqual(['Kamau Dairy', 'Bahati']);
  });

  it('hides itself when there’s only one workspace', () => {
    tenant.value = { isCooperative: true, activeFarm: { id: 3, name: 'Kamau Dairy' }, availableFarms: [{ id: 3, name: 'Kamau Dairy' }], switchFarm: vi.fn() };
    render(<FarmSwitcher />);
    expect(screen.queryByLabelText('Active Workspace')).toBeNull();
  });
});
