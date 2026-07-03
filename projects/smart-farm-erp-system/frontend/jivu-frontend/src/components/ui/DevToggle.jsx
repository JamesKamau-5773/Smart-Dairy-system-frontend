import React, { useState } from 'react';
import { ToggleLeft } from 'lucide-react';

export default function DevToggle() {
  const [adminMode, setAdminMode] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      className={`ml-2 text-xs ${adminMode ? 'btn-command' : 'btn-secondary'}`}
      onClick={() => setAdminMode((next) => !next)}
      title="Toggle dev admin mode"
    >
      <ToggleLeft size={14} className="inline-block mr-2" /> Dev Admin: {adminMode ? 'ON' : 'OFF'}
    </button>
  );
}
