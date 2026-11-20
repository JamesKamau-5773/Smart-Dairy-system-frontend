import { useTenant } from '../hooks/useTenant';

const farmLabel = (farm) => farm?.name ?? farm?.farm_name ?? farm?.farmName ?? `Farm ${farm?.id ?? ''}`.trim();

// The select was blank whenever the active farm wasn't in `available_farms`, its
// id type differed ("3" vs 3), or a farm had no `name`. Ids are compared as
// strings and the active farm is always an option.
function getWorkspaceOptions(activeFarm, availableFarms) {
  const options = (Array.isArray(availableFarms) ? availableFarms : [])
    .filter((farm) => farm?.id !== undefined && farm?.id !== null)
    .map((farm) => ({ value: String(farm.id), label: farmLabel(farm) }));
  if (activeFarm?.id !== undefined && !options.some((option) => option.value === String(activeFarm.id))) {
    options.unshift({ value: String(activeFarm.id), label: farmLabel(activeFarm) });
  }
  return options;
}

export default function FarmSwitcher() {
  const { activeFarm, availableFarms, switchFarm, isSwitching, isCooperative, switchError } = useTenant();

  if (!activeFarm || !isCooperative) return null;
  const options = getWorkspaceOptions(activeFarm, availableFarms);
  // Nothing to switch between: a one-option dropdown is just noise.
  if (options.length < 2) return null;

  return (
    <div className="p-4 border-b border-ink/10 bg-surface-raised">
      <label htmlFor="workspace-switcher" className="block text-field-label text-ink-muted mb-2">
        Active Workspace
      </label>
      <select
        id="workspace-switcher"
        className="input-brutalist cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-brand text-control"
        value={String(activeFarm.id)}
        onChange={(e) => switchFarm(e.target.value)}
        disabled={isSwitching}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {switchError && !isSwitching && (
        <p role="alert" className="mt-2 text-meta text-danger">{switchError}</p>
      )}

      {isSwitching && (
        <div className="text-meta mt-2 animate-pulse text-brand">
          Switching farm context…
        </div>
      )}
    </div>
  );
}
