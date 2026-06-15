import React, { useState } from 'react';
import { ToggleLeft } from 'lucide-react';
import { worker } from '../../mocks/browser';
import { adminLoginHandler } from '../../mocks/handlers';

export default function DevToggle() {
  const [adminMode, setAdminMode] = useState(false);

  const handleToggle = () => {
    const next = !adminMode;
    setAdminMode(next);

    if (next) {
      // Add an overriding handler at runtime so subsequent login calls
      // return the admin payload.
      worker.use(adminLoginHandler());
    } else {
      // Reload the page to reset the worker handlers back to the original set.
      // MSW doesn't provide a direct "remove handler" API; restarting the
      // page is the simplest approach for dev convenience.
      window.location.reload();
    }
  };

  // Only render in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      className={`ml-2 px-2 py-1 text-xs rounded-md border ${adminMode ? 'bg-brand text-surface' : 'bg-surface'}`}
      onClick={handleToggle}
      title="Toggle MSW Admin Override"
    >
      <ToggleLeft size={14} className="inline-block mr-2" /> Dev Admin: {adminMode ? 'ON' : 'OFF'}
    </button>
  );
}
