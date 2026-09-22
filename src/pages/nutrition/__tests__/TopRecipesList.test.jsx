import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TopRecipesList from '../TopRecipesList';

const recipes = [
  {
    id: 1,
    name: 'Boma Rhodes, dry maize stalks, and Napier grass',
    recipe_type: 'main_meal',
    target_protein_percentage: 16,
    ingredients: [
      { ingredientName: 'Boma Rhodes', inclusionPercentage: 45 },
      { ingredientName: 'Dry maize stalks', inclusionPercentage: 30 },
      { ingredientName: 'Napier grass', inclusionPercentage: 25 },
    ],
    performance: {
      avgDailyYieldLiters: 23,
      costPerLiter: 5.14,
      lastFedOn: '2026-09-15',
    },
  },
];

describe('TopRecipesList', () => {
  it('renders familiar table columns and keeps recipe details expandable', () => {
    render(
      <MemoryRouter>
        <TopRecipesList recipes={recipes} />
      </MemoryRouter>
    );

    const table = screen.getByRole('table');
    ['Rank', 'Mix Name', 'Daily Milk Average', 'Cost per Liter'].forEach((heading) => {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeTruthy();
    });
    expect(within(table).getByText('Boma Rhodes, dry maize stalks, and Napier grass')).toBeTruthy();
    expect(within(table).getByText('23.0 L')).toBeTruthy();
    expect(within(table).getByText('KES 5.14 / L')).toBeTruthy();

    fireEvent.click(within(table).getByRole('button', { name: /Boma Rhodes/ }));

    expect(within(table).getByText('Formula Breakdown')).toBeTruthy();
    expect(within(table).getByText('Dry maize stalks')).toBeTruthy();
    expect(within(table).getByText('30%')).toBeTruthy();
  });
});