import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './providers/ThemeProvider';
import { installGlobalErrorCapture } from './lib/telemetry';

// Capture uncaught errors / unhandled rejections into the telemetry buffer.
installGlobalErrorCapture();

// Initialize theme from localStorage before React renders to prevent flash of wrong theme.
// This logic should match the one in ThemeProvider.
try {
  const theme = localStorage.getItem('color-theme');
  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
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
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
);