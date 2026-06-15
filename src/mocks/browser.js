// src/mocks/browser.js
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Expose the worker so the app can programmatically add runtime handlers
// (e.g., dev admin toggle). Import `worker` from UI code and call
// `worker.use(adminLoginHandler())` to enable the admin login override.
export const worker = setupWorker(...handlers)