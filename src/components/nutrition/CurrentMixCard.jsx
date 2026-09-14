import React from 'react';
import { PackageCheck, AlertCircle, Utensils } from 'lucide-react';

const FEEDING_GROUPS = [
  { value: 'lactating', label: 'Lactating cows' },
  { value: 'dry', label: 'Dry cows' },
  { value: 'calf_0_3m', label: 'Calves 0-3 months' },
  { value: 'calf_3_6m', label: 'Calves 3-6 months' },
  { value: 'heifer', label: 'Heifers' },
];

export default function CurrentMixCard({ mix, onRecordConsumption, isRecording = false }) {
  const [consumedWeight, setConsumedWeight] = React.useState('');
  const [feedingGroup, setFeedingGroup] = React.useState('');

  if (!mix || !mix.totalWeight || mix.totalWeight <= 0) {
    return (
      <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5 flex flex-col justify-center min-h-[240px] text-center">
        <h3 className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-normal text-brand-dark mb-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
          <PackageCheck size={16} /> What We're Feeding Now
        </h3>
        <p className="text-sm font-semibold text-ink-strong">
          No feed batch is active yet.
        </p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          A saved mix is a recipe only. Create a feed batch from that recipe to track what is currently in store and being fed.
        </p>
      </div>
    );
  }

  const stockPercentage = mix.totalWeight > 0
    ? Math.round((mix.remainingWeight / mix.totalWeight) * 100)
    : 0;
  // Guard against division by zero when the daily feeding rate is unknown/not yet set.
  const feedingRate = Number(mix.dailyFeedingRate) || 0;
  const backendDaysLeft = Number(mix.daysUntilEmpty);
  const daysLeft = Number.isFinite(backendDaysLeft)
    ? backendDaysLeft
    : (feedingRate > 0 ? Math.floor(mix.remainingWeight / feedingRate) : null);
  const isLowStock = daysLeft !== null && daysLeft <= 3;
  const hasRecordedPace = mix.rateBasis === 'recorded_events' && feedingRate > 0;

  const handleRecordConsumption = async (event) => {
    event.preventDefault();
    const amount = Number(consumedWeight);
    if (!Number.isFinite(amount) || amount <= 0 || amount > mix.remainingWeight) {
      return;
    }
    try {
      await onRecordConsumption?.({ consumedWeight: amount, feedingGroup });
      setConsumedWeight('');
    } catch {
      // The parent mutation displays the backend validation message.
    }
  };

  return (
    <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5 flex flex-col justify-between">
      <div>
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-brand-dark mb-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
          <PackageCheck size={16} /> What We're Feeding Now
        </h3>

        <h4 className="text-xl font-black text-ink-strong">{mix.name}</h4>
        <p className="text-xs font-medium text-ink-muted mt-1">Mixed on {mix.mixedOn}</p>

        <div className="mt-6">
          <div className="flex justify-between text-xs font-bold text-ink-strong mb-2">
            <span>Stock Level</span>
            <span>{stockPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isLowStock ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <div className={`mt-4 rounded-lg p-4 border ${isLowStock ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-surface-raised border-ink/10 text-ink-strong'}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1">
            {isLowStock && <AlertCircle size={16} />}
            {hasRecordedPace && daysLeft !== null
              ? `About ${daysLeft} days remaining at the recorded pace`
              : 'No depletion forecast yet'}
          </div>
          <p className="text-xs font-medium opacity-80">
            {hasRecordedPace
              ? `Based on recorded feed use of ${feedingRate} kg per day.`
              : 'Record feeding as it happens to calculate the daily rate and remaining days.'}
          </p>
        </div>

        {mix.remainingWeight > 0 && onRecordConsumption && (
          <form onSubmit={handleRecordConsumption} className="mt-4 border-t border-ink/10 pt-4">
            <label htmlFor={`consumption-${mix.batchId}`} className="mb-2 block text-[10px] font-bold uppercase text-ink-muted">
              Feed used today (kg)
            </label>
            <div className="flex gap-2">
              <select
                value={feedingGroup}
                onChange={(event) => setFeedingGroup(event.target.value)}
                aria-label="Animal feeding group"
                className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
                required
              >
                <option value="">Select animal group</option>
                {FEEDING_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>{group.label}</option>
                ))}
              </select>
              <input
                id={`consumption-${mix.batchId}`}
                type="number"
                min="0.001"
                max={mix.remainingWeight}
                step="0.001"
                value={consumedWeight}
                onChange={(event) => setConsumedWeight(event.target.value)}
                placeholder={`Up to ${mix.remainingWeight} kg`}
                className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={isRecording || !feedingGroup || !Number(consumedWeight) || Number(consumedWeight) > mix.remainingWeight}
                className="btn-command flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-50"
              >
                <Utensils size={15} /> {isRecording ? 'Recording' : 'Record feeding'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-surface-raised rounded-lg p-4 text-center border border-ink/5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted mb-1">Fed So Far</span>
          <span className="text-lg font-black text-ink-strong">{mix.consumedWeight} kg</span>
        </div>
        <div className="bg-surface-raised rounded-lg p-4 text-center border border-ink/5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted mb-1">Still In Store</span>
          <span className="text-lg font-black text-brand">{mix.remainingWeight} kg</span>
        </div>
      </div>
    </div>
  );
}
