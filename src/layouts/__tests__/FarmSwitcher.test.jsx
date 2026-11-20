import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FarmSwitcher from '../FarmSwitcher';
import { useTenant } from '../../hooks/useTenant';

vi.mock('../../hooks/useTenant', () => ({ useTenant: vi.fn() }));
afterEach(cleanup);

const tenant = (overrides) => ({
  activeFarm: { id: 1, name: 'Main Farm' },
  availableFarms: [{ id: 1, name: 'Main Farm' }, { id: 2, name: 'Hill Farm' }],
  switchFarm: vi.fn(),
  isSwitching: false,
  isCooperative: true,
  switchError: '',
  ...overrides,
});

describe('FarmSwitcher', () => {
  it('tells the farmer when switching farms failed, instead of doing nothing', () => {
    useTenant.mockReturnValue(tenant({ switchError: 'No internet connection. You’re still on the same farm. Try again when you’re back online.' }));
    render(<FarmSwitcher />);
    expect(screen.getByRole('alert').textContent).toContain('You’re still on the same farm');
  });

  it('shows no error while a switch is in progress', () => {
    useTenant.mockReturnValue(tenant({ switchError: 'old error', isSwitching: true }));
    render(<FarmSwitcher />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
