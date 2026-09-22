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
      <div className="flex min-h-[240px] flex-col justify-center border border-slate-300 bg-white p-6 text-center">
        <h3 className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <PackageCheck size={16} /> What We're Feeding Now
        </h3>
        <p className="text-sm font-semibold text-slate-900">
          No feed batch is active yet.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-600">
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
    <div className="flex flex-col justify-between border border-slate-300 bg-white p-6">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <PackageCheck size={16} /> What We're Feeding Now
        </h3>

        <h4 className="text-xl font-black text-slate-900">{mix.name}</h4>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Mixed on <span className="font-mono tabular-nums tracking-tight">{mix.mixedOn}</span>
        </p>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-900">
            <span>Stock Level</span>
            <span className="font-mono tabular-nums tracking-tight">{stockPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden bg-slate-200">
            <div
              className={`h-full transition-all duration-500 ${isLowStock ? 'bg-red-700' : 'bg-brand'}`}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <div className={`mt-4 border border-slate-300 border-l-4 bg-white p-4 text-slate-900 ${isLowStock ? 'border-l-red-700' : 'border-l-amber-500'}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1">
            {isLowStock && <AlertCircle size={16} />}
            {hasRecordedPace && daysLeft !== null
              ? <>About <span className="font-mono tabular-nums tracking-tight">{daysLeft}</span> days remaining at the recorded pace</>
              : 'No depletion forecast yet'}
          </div>
          <p className="text-xs font-medium text-slate-700">
            {hasRecordedPace
              ? <>Based on recorded feed use of <span className="font-mono tabular-nums tracking-tight">{feedingRate} kg</span> per day.</>
              : 'Record feeding as it happens to calculate the daily rate and remaining days.'}
          </p>
        </div>

        {mix.remainingWeight > 0 && onRecordConsumption && (
          <form onSubmit={handleRecordConsumption} className="mt-4 border-t border-slate-300 pt-4">
            <label htmlFor={`consumption-${mix.batchId}`} className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Feed used today (kg)
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <select
                value={feedingGroup}
                onChange={(event) => setFeedingGroup(event.target.value)}
                aria-label="Animal feeding group"
                className="min-w-0 rounded-md border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                className="min-w-0 rounded-md border border-slate-400 bg-white px-3 py-2 font-mono text-sm font-semibold tabular-nums tracking-tight text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="submit"
                disabled={isRecording || !feedingGroup || !Number(consumedWeight) || Number(consumedWeight) > mix.remainingWeight}
                className="btn-command gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1"
              >
                <Utensils size={15} /> {isRecording ? 'Recording' : 'Record feeding'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="border border-slate-300 bg-white p-4 text-center">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Fed So Far</span>
          <span className="font-mono text-lg font-black tabular-nums tracking-tight text-slate-900">{mix.consumedWeight} kg</span>
        </div>
        <div className="border border-slate-300 bg-white p-4 text-center">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Still In Store</span>
          <span className="font-mono text-lg font-black tabular-nums tracking-tight text-slate-900">{mix.remainingWeight} kg</span>
        </div>
      </div>
    </div>
  );
}
