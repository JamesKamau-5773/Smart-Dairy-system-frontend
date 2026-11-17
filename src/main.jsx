import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import ErrorBoundary from './components/errors/ErrorBoundary';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './providers/ThemeProvider';
import { installGlobalErrorCapture } from './lib/telemetry';
import { readStoredTheme } from './lib/themePreference';

// Capture uncaught errors / unhandled rejections into the telemetry buffer.
installGlobalErrorCapture();

registerSW({ immediate: true });

// Set the theme before React renders, to prevent a flash of the wrong one. ThemeProvider
// reads the same saved value (src/lib/themePreference.js).
document.documentElement.dataset.theme = readStoredTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <QueryProvider>
            <TenantProvider>
              <App />
              {/* Single source of truth for all user-facing notifications.
                  z-[9999] keeps toasts above every modal/overlay (z-50..z-[100]). */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { zIndex: 9999 },
                  success: { duration: 3000 },
                  error: { duration: 6000 },
                }}
                containerStyle={{ zIndex: 9999 }}
              />
            </TenantProvider>
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);