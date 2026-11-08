// The shared statement page shows only what the backend sends, and stays off (with no request)
// until statement links stop using phone numbers as tokens (BR-016).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerPortal from '../external/CustomerPortal';
import { normalizeStatement } from '../../lib/customerStatement';

const api = vi.hoisted(() => ({ statement: vi.fn() }));
const flags = vi.hoisted(() => ({ customerPortal: true }));
vi.mock('../../lib/backendApi', () => ({ financeApi: { statement: api.statement } }));
vi.mock('../../lib/featureFlags', () => ({ isFeatureEnabled: (name) => Boolean(flags[name]) }));

function renderPortal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/shared/statement/abc']}>
        <Routes><Route path="/shared/statement/:token" element={<CustomerPortal />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => { flags.customerPortal = true; api.statement.mockReset(); });
afterEach(cleanup);

describe('CustomerPortal', () => {
  it('is off by default and makes no request', () => {
    flags.customerPortal = false;
    renderPortal();
    expect(screen.getByRole('heading', { name: 'Statement links aren’t available yet' })).toBeTruthy();
    expect(api.statement).not.toHaveBeenCalled();
  });

  it('shows the backend’s customer, balance and transactions', async () => {
    api.statement.mockResolvedValue({
      customer: { name: 'Wanjiku Kiosk', account_balance: 3700 },
      transactions: [{ id: 1, date: '2026-11-08', description: 'Milk delivery', reference_code: 'QX12', amount: 1200 }],
    });
    renderPortal();
    expect(await screen.findByRole('heading', { name: 'Wanjiku Kiosk' })).toBeTruthy();
    expect(screen.getByText('KES 3,700.00')).toBeTruthy();
    expect(screen.getByText('Milk delivery')).toBeTruthy();
    expect(screen.getByText('2026-11-08 · QX12')).toBeTruthy();
  });

  it('shows "—" for what the backend didn’t send, never made-up figures', async () => {
    api.statement.mockResolvedValue({ transactions: [] });
    renderPortal();
    expect(await screen.findByRole('heading', { name: '—' })).toBeTruthy();
    expect(screen.getByText('No transactions on this statement yet.')).toBeTruthy();
    expect(screen.queryByText(/KES 0/)).toBeNull();
    expect(screen.queryByText(/Net 30|Verified/)).toBeNull();
  });

  it('explains an invalid link', async () => {
    api.statement.mockRejectedValue({ response: { status: 404 } });
    renderPortal();
    expect(await screen.findByRole('heading', { name: 'This statement link isn’t valid' })).toBeTruthy();
    expect(api.statement).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when loading fails', async () => {
    api.statement.mockRejectedValue({ response: { status: 500 } });
    renderPortal();
    expect(await screen.findByRole('heading', { name: 'We couldn’t load this statement' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    // Retried on a server error, but not on an invalid link (see the 404 test).
    expect(api.statement).toHaveBeenCalledTimes(3);
  });
});

describe('normalizeStatement', () => {
  it('keeps unknown amounts null', () => {
    expect(normalizeStatement({ customer: { name: ' ', account_balance: null }, transactions: [{ amount: 'x' }] })).toEqual({
      customerName: null, balance: null,
      transactions: [{ id: null, date: null, description: null, reference: null, amount: null }],
    });
  });
});
