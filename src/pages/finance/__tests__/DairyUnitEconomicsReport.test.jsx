import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DairyUnitEconomicsReport from '../DairyUnitEconomicsReport';
import { reportsApi } from '../../../lib/backendApi';

vi.mock('../../../lib/backendApi', () => ({
  reportsApi: {
    getDairyUnitEconomics: vi.fn(),
    getDairyUnitEconomicsByFarm: vi.fn(),
    calculateDairyUnitEconomics: vi.fn(),
  },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(createElement(QueryClientProvider, { client: queryClient }, ui));
}

describe('DairyUnitEconomicsReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a plain-language tenant overview with contextual help', async () => {
    reportsApi.getDairyUnitEconomics.mockResolvedValueOnce({
      inputs: {
        new_customers_acquired: 3,
        customer_lifespan_months: 12,
      },
      operational: {
        active_accounts_total: 11,
        liters_sold_total: 497.5,
        liters_per_month_per_account: 45.2273,
        revenue_total_kes: 13200,
        revenue_b2c_deliveries_kes: 13200,
        revenue_b2b_sales_kes: 0,
        gross_margin_per_liter_kes: 26.53,
        production_cost_total_kes: null,
      },
      receivables: {
        current_net_balance_kes: 24780,
        current_outstanding_kes: 26000,
        current_customer_credit_kes: 1220,
      },
      data_quality: {
        has_recorded_production_costs: false,
        has_recorded_marketing_spend: false,
        zero_price_delivery_count: 0,
        zero_price_billable_liters: 0,
      },
      results: {
        cac_kes: null,
        ltv_kes: 1200,
        realized_ltv_kes: 1200,
        forecast_ltv_kes: 2400,
        ltv_to_cac_ratio: null,
        benchmark_status: 'unknown',
      },
    });

    renderWithClient(createElement(DairyUnitEconomicsReport));

    await waitFor(() => {
      expect(screen.getByText('Customer Value & Profit')).toBeTruthy();
      expect(screen.getByText(/You gained/).textContent).toContain('You gained 3 new customers this period!');
      expect(screen.getByText(/KES 1,200/i)).toBeTruthy();
      expect(screen.getByText('Total Profit per Customer')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Cost to Get a Customer' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Total Profit per Customer' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'About Profit vs. Cost Ratio' })).toBeTruthy();
      expect(screen.getByText(/KES 2,400/i)).toBeTruthy();
      expect(screen.getByText('11')).toBeTruthy();
      expect(screen.getAllByText(/KES 13,200/i)).toHaveLength(2);
      expect(screen.getByText(/KES 24,780/i)).toBeTruthy();
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
      expect(screen.getByText('Not recorded')).toBeTruthy();
      expect(screen.getByText(/45\.23 L/i)).toBeTruthy();
      expect(screen.getByText(/No costs recorded/i)).toBeTruthy();
    });
  });
});
