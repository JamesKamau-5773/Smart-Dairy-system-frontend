import { defineConfig, devices } from '@playwright/test';

// Two ways to run the same journeys (e2e/):
//  - phone-mocked (every PR): the production build, with the API answered in the
//    browser by e2e/support/mockBackend.js. Fast, no secrets, no backend.
//  - phone-full-stack (nightly): a real frontend + backend + database, given by
//    E2E_BASE_URL. Catches what mocks can't (missing routes, CORS, migrations).
const FULL_STACK = process.env.E2E_FULL_STACK === '1';
const MOCK_PORT = 4173;
// Never resolves to a real server: every request to it is answered by the mock.
export const MOCK_API_ORIGIN = 'http://api.e2e.test';

// Farmers mostly use low-end Android phones.
const phone = { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !FULL_STACK,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-KE',
    timezoneId: 'Africa/Nairobi',
    // The PWA service worker would answer requests before the API mock can.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'phone-mocked',
      use: { ...phone, baseURL: `http://localhost:${MOCK_PORT}` },
    },
    {
      name: 'phone-full-stack',
      use: { ...phone, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173' },
    },
  ],
  // Only the mocked project needs a server started here; full-stack points at a running one.
  webServer: FULL_STACK ? undefined : {
    command: `npm run build && npx vite preview --port ${MOCK_PORT} --strictPort`,
    url: `http://localhost:${MOCK_PORT}/app.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_API_BASE_URL: MOCK_API_ORIGIN },
  },
});
