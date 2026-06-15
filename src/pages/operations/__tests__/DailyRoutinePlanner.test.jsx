import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DailyRoutinePlanner from '../DailyRoutinePlanner';

describe('DailyRoutinePlanner', () => {
  beforeEach(() => {
    localStorage.removeItem('operations_schedule_planner');
  });

  it('renders header and save button', () => {
    render(<DailyRoutinePlanner />);
    expect(screen.getByText('Daily Routine Planner')).toBeTruthy();
    expect(screen.getAllByText(/Save Routine|Save Planner|Save Schedule/i).length).toBeGreaterThan(0);
    // should show at least one task button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
