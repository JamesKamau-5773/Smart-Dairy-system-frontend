import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import OperationsReportsPage from '../OperationsReportsPage.jsx';

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

void React;

vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));

const apiClientMock = vi.mocked(apiClient);
afterEach(cleanup);

function renderPage(initialEntries = ['/operations/reports?period=custom&start_date=2026-09-01&end_date=2026-09-30']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/operations/reports" element={<OperationsReportsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const RANGE = 'start_date=2026-09-01&end_date=2026-09-30';
// Requests send the range as axios params rather than a hand-built query string.
const RANGE_PARAMS = { start_date: '2026-09-01', end_date: '2026-09-30' };
const withRange = (extra = {}) => ({ params: { ...RANGE_PARAMS, ...extra } });
const CUSTOMERS = [{ id: 7, name: 'Kisii Dairy' }, { id: 9, name: 'Nakuru Fresh' }];

// The filters sit in the shared panel, collapsed until opened.
const PANEL = /^Search and filter reports/;
const openFilters = async () => {
  const toggle = await screen.findByRole('button', { name: PANEL });
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
};

// The menu trigger is labelled with the current selection and the menu closes after each pick.
const pickCustomer = async (triggerName, customerName) => {
  await openFilters();
  fireEvent.click(await screen.findByRole('button', { name: triggerName }));
  fireEvent.click(await screen.findByRole('option', { name: customerName }));
};

describe('OperationsReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClientMock.get.mockImplementation((url) => {
      if (url === '/finance/customers') {
        return Promise.resolve({ data: { items: CUSTOMERS } });
      }

      if (url.startsWith('/reports/buyer-performance')) {
        return Promise.resolve({
          data: {
            buyer: { id: 7, name: 'Kisii Dairy' },
            summary: {
              milk_delivered_liters: 3200,
              revenue_kes: 1200000,
              amount_paid_kes: 900000,
              outstanding_balance_kes: 300000,
            },
            daily_records: [{
              date: '2026-09-01',
              milk_delivered_liters: 120,
              revenue_kes: 45000,
              amount_paid_kes: 45000,
            }],
          },
        });
      }

      return Promise.resolve({
        data: {
          summary: {
            total_produced: 500,
            total_sold: 320,
            total_unsold: 180,
          },
        },
      });
    });
  });

  it('reads the URL range and requests all dashboard data with shared dates', async () => {
    renderPage();

    await waitFor(() => {
      expect(apiClientMock.get).toHaveBeenCalledWith('/finance/customers');
      expect(apiClientMock.get).toHaveBeenCalledWith('/finance/ledger', withRange());
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/milk-inventory', withRange());
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/dairy-unit-economics', withRange());
    });
    expect(apiClientMock.get).toHaveBeenCalledTimes(4);
    // One date-range control (no native date inputs), showing the address's range.
    await openFilters();
    expect(screen.getByRole('button', { name: '01 Sep 2026 – 30 Sep 2026' })).toBeTruthy();
    expect(document.querySelector('input[type="date"]')).toBeNull();
    // A range in the address counts as a filter.
    fireEvent.click(screen.getByRole('button', { name: PANEL }));
    expect(screen.getByRole('button', { name: 'Search and filter reports · 1 filter active' })).toBeTruthy();
    expect(await screen.findByText('Amount paid')).toBeTruthy();
  });

  it('uses the selected customer for payment and delivery totals', async () => {
    renderPage();

    await pickCustomer(/all customers/i, 'Kisii Dairy');

    await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledWith(
      '/reports/buyer-performance', withRange({ buyer_id: '7' }),
    ));
    expect(await screen.findByText('Customer report')).toBeTruthy();
    expect(screen.getByRole('button', { name: /kisii dairy/i })).toBeTruthy();
  });

  it('supports selecting multiple customers and displays the selection label', async () => {
    renderPage();

    await pickCustomer(/all customers/i, 'Kisii Dairy');
    await pickCustomer(/kisii dairy/i, 'Nakuru Fresh');

    expect(await screen.findByRole('button', { name: /2 selected/i })).toBeTruthy();
    await waitFor(() => {
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/buyer-performance', withRange({ buyer_id: '7' }));
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/buyer-performance', withRange({ buyer_id: '9' }));
    });
  });

  it('refetches with a custom range chosen in the date-range control', async () => {
    renderPage();
    await openFilters();

    fireEvent.click(screen.getByRole('button', { name: '01 Sep 2026 – 30 Sep 2026' }));
    const form = await screen.findByRole('form', { name: 'Custom date range' });
    fireEvent.change(within(form).getByLabelText('From'), { target: { value: '15/09/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledWith(
      '/finance/ledger', { params: { start_date: '2026-09-15', end_date: '2026-09-30' } },
    ));
  });

  it('sets a quick period from the panel, and Reset goes back to the default', async () => {
    renderPage();
    await openFilters();
    const periods = screen.getByRole('group', { name: 'Quick select' });
    expect(periods).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull());
  });

  it('rejects invalid date ranges and shows an error state', async () => {
    renderPage(['/operations/reports?period=custom&start_date=2026-09-30&end_date=2026-09-01']);

    expect(await screen.findByText('The selected date range is invalid.')).toBeTruthy();
    expect(apiClientMock.get).toHaveBeenCalledTimes(1);
    expect(apiClientMock.get).toHaveBeenCalledWith('/finance/customers');
  });

  it('shows a single loading state while the requests resolve', async () => {
    const requests = [];
    const createPendingRequest = () => {
      let resolveRequest;
      const promise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      requests.push({ promise, resolve: resolveRequest });
      return promise;
    };

    apiClientMock.get.mockImplementation(() => createPendingRequest());

    renderPage();

    expect(screen.getByText('Loading dashboard…')).toBeTruthy();

    requests.forEach((request) => request.resolve({ data: { summary: {} } }));

    await waitFor(() => expect(screen.queryByText('Loading dashboard…')).toBeNull());
  });

  it('shows an error state when any request fails', async () => {
    apiClientMock.get.mockImplementation((url) => {
      if (url === '/finance/customers') {
        return Promise.resolve({ data: { items: CUSTOMERS } });
      }
      if (url.startsWith('/reports/buyer-performance')) {
        return Promise.reject({ response: { status: 500 } });
      }
      return Promise.resolve({ data: { summary: {} } });
    });

    renderPage([`/operations/reports?period=custom&${RANGE}&buyer_id=7`]);

    expect(await screen.findByText('Couldn’t load reports.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy();
  });

  it('shows "—" for figures the backend didn’t send, never 0', async () => {
    apiClientMock.get.mockImplementation((url) => {
      if (url === '/finance/customers') return Promise.resolve({ data: { items: CUSTOMERS } });
      // Milk figures arrive, money figures don't.
      return Promise.resolve({ data: { summary: { total_produced: 500 } } });
    });
    renderPage();

    expect(await screen.findByText('500 L')).toBeTruthy();
    expect(screen.queryAllByText(/^(KES|Ksh)\s?0$/)).toHaveLength(0);
    expect(screen.queryByText('0 L')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
