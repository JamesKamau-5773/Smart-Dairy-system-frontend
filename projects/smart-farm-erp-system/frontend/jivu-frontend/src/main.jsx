import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './providers/ThemeProvider';

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
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
);