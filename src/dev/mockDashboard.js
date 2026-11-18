// DEVELOPMENT ONLY. Mock answers for the Command Center's two requests, so the dashboard can be
// seen with figures when the local database has no recent milk. Every other request goes to the
// real backend. Loaded by src/lib/apiClient.js only when `import.meta.env.DEV` and
// VITE_MOCK_DASHBOARD are set, so production builds never contain it.
//
//   .env.development.local:  VITE_MOCK_DASHBOARD=full     (then restart `npm run dev`)
//   Scenarios: full · empty (no milking today) · negative (a loss, milk remaining below zero)
//   Switch without restarting: add ?mock=empty (or full, negative) to the page address.
import { subDays } from 'date-fns';
import { toLocalIsoDate, todayLocalIso } from '../lib/localDate';

const SUMMARIES = {
  full: {
    production_total_liters: 246.5, saleable_liters: 231.0, total_sold_liters: 180.0, remaining_milk_liters: 51.0,
    cows_milked: 18, avg_per_cow: 13.7, profit_per_liter: 18.4,
    revenue_total_kes: 9360, feed_cost_total_kes: 4820, net_margin_kes: 4540,
    revenue_breakdown: { transaction_revenue_kes: 9360, report_sales_revenue_kes: 9000 },
    currency: 'KES',
  },
  empty: {
    production_total_liters: 0, saleable_liters: 0, total_sold_liters: 0, remaining_milk_liters: 0,
    cows_milked: 0, avg_per_cow: 0, profit_per_liter: 0,
    revenue_total_kes: 0, feed_cost_total_kes: 0, net_margin_kes: 0,
    currency: 'KES',
  },
  negative: {
    production_total_liters: 120.0, saleable_liters: 110.0, total_sold_liters: 130.0, remaining_milk_liters: -20.0,
    cows_milked: 9, avg_per_cow: 13.3, profit_per_liter: -4.25,
    revenue_total_kes: 4200, feed_cost_total_kes: 4850, net_margin_kes: -650,
    revenue_breakdown: { transaction_revenue_kes: 4200, report_sales_revenue_kes: 4100 },
    currency: 'KES',
  },
};

// 120 days of daily litres ending today, with a weekly rhythm and a few unrecorded days.
function dailyGroups(scenario) {
  const today = new Date();
  return Array.from({ length: 120 }, (_, index) => {
    const daysAgo = 119 - index;
    const key = toLocalIsoDate(subDays(today, daysAgo));
    if (daysAgo % 17 === 5) return null; // a day nobody recorded
    if (daysAgo === 0 && scenario === 'empty') return null;
    const litres = 215 + 25 * Math.sin(index / 3.5) + (index % 7) * 2.5 + index * 0.2;
    return { level: 'day', key, label: key, litres: litres.toFixed(1), entries: 36 };
  }).filter(Boolean);
}

const scenarioOf = (fallback) => {
  const fromUrl = new URLSearchParams(window.location.search).get('mock');
  const name = fromUrl ?? fallback;
  return name in SUMMARIES ? name : 'full';
};

function answer(config, url, scenario) {
  const params = config.params ?? {};
  if (url.endsWith('/production/summary') && !params.period) return SUMMARIES[scenario];
  if (url.endsWith('/production/group-totals') && String(params.levels ?? '') === 'day') {
    const from = params.date_from ?? '0000-00-00';
    const to = params.date_to ?? todayLocalIso();
    return { groups: dailyGroups(scenario).filter((group) => group.key >= from && group.key <= to) };
  }
  return undefined;
}

/** A request interceptor: answers the dashboard's requests from the fixtures, passes the rest on. */
export function mockDashboardRequest(config, defaultScenario) {
  const url = String(config.url ?? '').split('?')[0];
  const scenario = scenarioOf(defaultScenario);
  const data = answer(config, url, scenario);
  if (data === undefined) return config;
  console.info(`[mock dashboard: ${scenario}] ${url}`);
  return {
    ...config,
    adapter: async () => ({ data, status: 200, statusText: 'OK (mock)', headers: {}, config, request: {} }),
  };
}
