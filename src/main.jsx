import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Initialize MSW (Mock Service Worker) for development
async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

// Initialize theme from localStorage before rendering
try {
  const t = localStorage.getItem('typographyTone');
  if (t) document.documentElement.dataset.theme = t;
  else document.documentElement.dataset.theme = 'soft';
} catch {}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryProvider>
        <AuthProvider>
          <TenantProvider>
            <App />
          </TenantProvider>
        </AuthProvider>
      </QueryProvider>
    </React.StrictMode>
  );
});