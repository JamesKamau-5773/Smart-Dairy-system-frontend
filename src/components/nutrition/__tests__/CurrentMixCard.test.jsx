import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CurrentMixCard from '../CurrentMixCard';

const activeMix = {
  batchId: 42,
  name: 'Main herd mix',
  mixedOn: '2026-06-11',
  totalWeight: 100,
  consumedWeight: 20,
  remainingWeight: 80,
  dailyFeedingRate: 0,
};

describe('CurrentMixCard', () => {
  it('distinguishes a saved recipe from an active feed batch', () => {
    render(React.createElement(CurrentMixCard, { mix: null }));

    expect(screen.getByText('No feed batch is active yet.')).toBeTruthy();
    expect(screen.getByText(/A saved mix is a recipe only/i)).toBeTruthy();
  });

  it('records feed against the selected non-lactating group', async () => {
    const onRecordConsumption = vi.fn().mockResolvedValue(undefined);
    render(React.createElement(CurrentMixCard, { mix: activeMix, onRecordConsumption }));

    fireEvent.change(screen.getByLabelText('Animal feeding group'), {
      target: { value: 'dry' },
    });
    fireEvent.change(screen.getByLabelText('Feed used today (kg)'), {
      target: { value: '12.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record feeding' }));

    await waitFor(() => {
      expect(onRecordConsumption).toHaveBeenCalledWith({
        consumedWeight: 12.5,
        feedingGroup: 'dry',
      });
    });
  });
});
