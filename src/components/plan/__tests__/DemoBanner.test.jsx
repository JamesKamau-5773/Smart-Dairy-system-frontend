import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoBanner from '../DemoBanner';
import { useAuth } from '../../../contexts/AuthContext';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const BANNER_TEXT = 'You are exploring a demo farm with sample data. Changes are not saved.';
const steps = [];
const logout = vi.fn(async () => { steps.push('logout'); });

function Where() {
  const { pathname } = useLocation();
  const step = `navigate ${pathname}`;
  if (pathname !== '/app' && steps.at(-1) !== step) steps.push(step);
  return <p>at {pathname}</p>;
}

const renderAs = (currentUser) => {
  useAuth.mockReturnValue({ currentUser, logout });
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <DemoBanner />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );
};

describe('DemoBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    steps.length = 0;
  });
  afterEach(cleanup);

  it('shows the demo notice when the backend says the session is the demo', () => {
    renderAs({ id: 1, is_demo: true });
    expect(screen.getByRole('status').textContent).toContain(BANNER_TEXT);
  });

  it.each([
    ['a real farm', { id: 1, is_demo: false }],
    ['a session that doesn’t say', { id: 1 }],
    ['a non-boolean value', { id: 1, is_demo: 'true' }],
    ['demo status only in entitlements', { id: 1, entitlements: { is_demo: true } }],
    ['no one signed in', null],
  ])('shows nothing for %s', (_, user) => {
    renderAs(user);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it.each([
    ['Create your free farm', '/register'],
    ['Log in', '/login'],
  ])('“%s” ends the demo session before going to %s', async (label, path) => {
    renderAs({ id: 1, is_demo: true });
    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(await screen.findByText(`at ${path}`)).toBeTruthy();
    await waitFor(() => expect(steps).toEqual(['logout', `navigate ${path}`]));
  });
});
