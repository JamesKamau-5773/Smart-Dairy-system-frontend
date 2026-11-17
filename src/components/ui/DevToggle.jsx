import React, { useState } from 'react';

export default function DevToggle() {
  const [adminMode, setAdminMode] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      className={`ml-2 text-control ${adminMode ? 'btn-command' : 'btn-secondary'}`}
      onClick={() => setAdminMode((next) => !next)}
      title="Toggle dev admin mode"
    >
      Dev Admin: {adminMode ? 'ON' : 'OFF'}
    </button>
  );
}
