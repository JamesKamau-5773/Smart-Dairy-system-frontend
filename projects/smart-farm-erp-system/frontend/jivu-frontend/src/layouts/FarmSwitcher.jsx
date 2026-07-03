import React from 'react';
import { useTenant } from '../hooks/useTenant';

export default function FarmSwitcher() {
  const { activeFarm, availableFarms, switchFarm, isSwitching, isCooperative } = useTenant();

  if (!activeFarm || !isCooperative) return null;

  return (
    <div className="p-4 border-b border-ink/10 bg-surface-raised">
      <label className="block font-sans font-medium text-xs tracking-normal text-ink mb-2">
        Active Workspace
      </label>
      <select 
        className="input-brutalist cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-brand font-medium"
        value={activeFarm.id}
        onChange={(e) => switchFarm(e.target.value)}
        disabled={isSwitching}
      >
        {availableFarms.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}
          </option>
        ))}
      </select>
      
      {isSwitching && (
        <div className="text-xs font-sans mt-2 animate-pulse text-brand font-medium">
          Switching farm context…
        </div>
      )}
    </div>
  );
}