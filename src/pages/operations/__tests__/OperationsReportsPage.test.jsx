import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '@/lib/apiBaseUrl';
import apiClient from '@/lib/apiClient';
import OperationsReportsPage from '../OperationsReportsPage.jsx';

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

const apiClientMock = vi.mocked(apiClient);

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

describe('OperationsReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClientMock.get.mockImplementation((url) => {
      if (url === '/finance/buyers') {
        return Promise.resolve({
          data: [{ id: 7, name: 'Kisii Dairy' }],
        });
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

    await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledTimes(4));

    expect(apiClientMock.get).toHaveBeenNthCalledWith(
      1,
      '/finance/buyers',
    );
    expect(apiClientMock.get).toHaveBeenNthCalledWith(
      2,
      '/finance/ledger?start_date=2026-09-01&end_date=2026-09-30',
    );
    expect(apiClientMock.get).toHaveBeenNthCalledWith(
      3,
      '/reports/milk-inventory?start_date=2026-09-01&end_date=2026-09-30',
    );
    expect(apiClientMock.get).toHaveBeenNthCalledWith(
      4,
      '/reports/dairy-unit-economics?start_date=2026-09-01&end_date=2026-09-30',
    );
    expect(screen.getByText('Amount paid')).toBeTruthy();
  });

  it('uses the selected buyer for payment and delivery totals', async () => {
    renderPage();

    const buyerButton = await screen.findByRole('button', { name: 'Kisii Dairy' });
    buyerButton.click();

    await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledWith(
      '/reports/buyer-performance?buyer_id=7&start_date=2026-09-01&end_date=2026-09-30',
    ));
    expect(screen.getByText('Buyer report')).toBeTruthy();
  });

  it('supports selecting multiple buyers and displays the selection label', async () => {
    renderPage();

    const buyerTrigger = await screen.findByRole('button', { name: /all buyers/i });
    buyerTrigger.click();

    const options = await screen.findAllByRole('option');
    options[1].click();
    options[2].click();

    expect(await screen.findByText('2 Buyers Selected')).toBeTruthy();
    expect(apiClientMock.get).toHaveBeenCalledWith(
      '/reports/buyer-performance?buyer_id=7&start_date=2026-09-01&end_date=2026-09-30',
    );
  });

  it('shows month and year dropdown selectors in the calendar header', async () => {
    renderPage();

    const dateTrigger = screen.getByRole('button', { name: /sep 1, 2026.*sep 30, 2026/i });
    dateTrigger.click();

    expect(screen.getByRole('combobox', { name: /month/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /year/i })).toBeTruthy();
  });

  it('rejects invalid date ranges and shows an error state', async () => {
    renderPage(['/operations/reports?period=custom&start_date=2026-09-30&end_date=2026-09-01']);

    expect(await screen.findByText('The selected date range is invalid.')).toBeTruthy();
    expect(apiClientMock.get).toHaveBeenCalledTimes(1);
    expect(apiClientMock.get).toHaveBeenCalledWith('/finance/buyers');
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
      if (url === '/finance/buyers') {
        return Promise.resolve({ data: [{ id: 7, name: 'Kisii Dairy' }] });
      }
      if (url.startsWith('/reports/buyer-performance')) {
        return Promise.reject({ response: { status: 500 } });
      }
      return Promise.resolve({ data: { summary: {} } });
    });

    renderPage();

    expect(await screen.findByText('Unable to load the reporting dashboard.')).toBeTruthy();
  });
});
