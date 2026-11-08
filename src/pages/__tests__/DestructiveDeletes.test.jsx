// UX audit phase 3: deleting a cow, a customer or a stock item asks the farmer to type its
// name or tag, shows what's at stake (a customer's balance), and when there is no connection
// says nothing was deleted instead of queueing the delete.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HerdRegistry from '../operations/HerdRegistry';
import Customers from '../operations/Customers';

const api = vi.hoisted(() => ({
  herd: { list: vi.fn(), delete: vi.fn() },
  finance: { listCustomers: vi.fn(), deleteCustomer: vi.fn() },
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

vi.mock('../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { ...actual.herdApi, ...api.herd },
    financeApi: { ...actual.financeApi, ...api.finance },
  };
});
vi.mock('../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: 'FARMER' } }) }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const offline = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isAxiosError: true });

function renderPage(Page) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Page /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Deleting a cow', () => {
  beforeEach(() => {
    api.herd.list.mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Lactating' }]);
  });

  const openDialog = async () => {
    renderPage(HerdRegistry);
    await screen.findAllByText('Neema');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    return screen.findByRole('dialog', { name: 'Delete Neema?' });
  };

  it('asks for her tag to be typed before Delete works', async () => {
    api.herd.delete.mockResolvedValue({});
    const dialog = await openDialog();
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(within(dialog).getAllByText(/Neema · KE-012 will be removed/).length).toBeGreaterThan(0);
    expect(confirm.disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText(/Type KE-012 to confirm/), { target: { value: 'ke-012' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.herd.delete).toHaveBeenCalled());
  });

  it('says she wasn’t deleted when there is no connection', async () => {
    api.herd.delete.mockRejectedValue(offline());
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(/to confirm/), { target: { value: 'KE-012' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'No internet connection. Neema wasn’t deleted. Try again when you’re back online.',
    ));
  });
});

describe('Deleting a customer', () => {
  const openDialog = async (customer) => {
    api.finance.listCustomers.mockResolvedValue([customer]);
    renderPage(Customers);
    await screen.findAllByText(customer.name);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    return screen.findByRole('dialog', { name: `Delete ${customer.name}?` });
  };

  it('shows the balance still owed and asks for the name to be typed', async () => {
    api.finance.deleteCustomer.mockResolvedValue({});
    const dialog = await openDialog({ id: 7, name: 'Wanjiku Kiosk', account_balance: 3700 });

    expect(within(dialog).getAllByText(/Wanjiku Kiosk still owes KES 3,700\.00\./).length).toBeGreaterThan(0);
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Type Wanjiku Kiosk to confirm/), { target: { value: 'wanjiku kiosk' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.finance.deleteCustomer).toHaveBeenCalledWith(7));
  });

  it('says when the balance couldn’t be checked, rather than implying it is settled', async () => {
    const dialog = await openDialog({ id: 8, name: 'Rift Coop' });
    expect(within(dialog).getAllByText(/Rift Coop’s balance couldn’t be checked\./).length).toBeGreaterThan(0);
  });

  it('mentions credit the customer still has', async () => {
    const dialog = await openDialog({ id: 9, name: 'Baraka Shop', account_balance: -250 });
    expect(within(dialog).getAllByText(/Baraka Shop has KES 250\.00 in credit\./).length).toBeGreaterThan(0);
  });

  it('says the customer wasn’t deleted when there is no connection', async () => {
    api.finance.deleteCustomer.mockRejectedValue(offline());
    const dialog = await openDialog({ id: 7, name: 'Wanjiku Kiosk', account_balance: 0 });
    fireEvent.change(within(dialog).getByLabelText(/to confirm/), { target: { value: 'Wanjiku Kiosk' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'No internet connection. Wanjiku Kiosk wasn’t deleted. Try again when you’re back online.',
    ));
  });
});
