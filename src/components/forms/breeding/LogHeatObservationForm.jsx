import { useState } from 'react';
import toast from 'react-hot-toast';
import { breedingApi } from '../../../lib/backendApi';
import { resolveCowIdentity } from '../../../lib/breedingUtils';

const HEAT_SIGNS = [
  ['standing_heat', 'Standing to be mounted'],
  ['mounting_others', 'Mounting other cows'],
  ['clear_mucus', 'Clear mucus discharge'],
  ['restlessness', 'Restlessness'],
  ['swollen_vulva', 'Swollen vulva'],
  ['reduced_feed', 'Reduced feed intake'],
];

function currentLocalDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function LogHeatObservationForm({ herdOptions = [], onSuccess, onError }) {
  const [cowId, setCowId] = useState('');
  const [observedAt, setObservedAt] = useState(currentLocalDateTime);
  const [intensity, setIntensity] = useState('MEDIUM');
  const [signs, setSigns] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleSign = (sign) => {
    setSigns((current) => current.includes(sign)
      ? current.filter((item) => item !== sign)
      : [...current, sign]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const resolvedCow = resolveCowIdentity(cowId, herdOptions);
    if (!resolvedCow.id || !observedAt) {
      const message = 'Cow and observation time are required.';
      onError?.(message);
      toast.error(message);
      return;
    }

    try {
      setIsSaving(true);
      const observation = await breedingApi.createHeatObservation({
        cow_id: resolvedCow.id,
        observed_at: new Date(observedAt).toISOString(),
        intensity,
        signs,
        notes: notes.trim(),
      });
      onSuccess?.(observation, `Heat observation recorded for ${resolvedCow.id}.`);
    } catch (error) {
      const message = error?.response?.data?.error || 'Failed to record heat observation.';
      onError?.(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Cow *</label>
        <select className="input-machined w-full" value={cowId} onChange={(event) => setCowId(event.target.value)} required>
          <option value="">Select cow</option>
          {herdOptions.map((cow) => <option key={cow.id} value={cow.id}>{cow.display}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Observed at *</label>
          <input type="datetime-local" className="input-machined w-full" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Intensity</label>
          <select className="input-machined w-full" value={intensity} onChange={(event) => setIntensity(event.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Observed signs</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {HEAT_SIGNS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-ink/10 p-3 text-sm font-semibold text-ink-strong">
              <input type="checkbox" checked={signs.includes(value)} onChange={() => toggleSign(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Notes</label>
        <textarea className="input-machined min-h-24 w-full" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      <button type="submit" disabled={isSaving} className="btn-command w-full py-2.5 text-sm disabled:opacity-50">
        {isSaving ? 'Recording...' : 'Record heat observation'}
      </button>
    </form>
  );
}
