import { useState } from 'react';
import toast from 'react-hot-toast';
import { breedingApi, getApiErrorMessage } from '../../../lib/backendApi';
import { resolveCowIdentity } from '../../../lib/breedingUtils';
import { formatCowIdentity } from '../../../lib/cowIdentity';
import { nowLocalDateTimeInput } from '../../../lib/localDate';
import { breedingCopy } from '../../../i18n/breeding';

// The sign codes saved with the observation; their labels are in breedingCopy.heatSigns.
const HEAT_SIGNS = ['standing_heat', 'mounting_others', 'clear_mucus', 'restlessness', 'swollen_vulva', 'reduced_feed'];

export default function LogHeatObservationForm({ herdOptions = [], onSuccess, onError }) {
  const copy = breedingCopy.heat;
  const [cowId, setCowId] = useState('');
  const [observedAt, setObservedAt] = useState(() => nowLocalDateTimeInput());
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
      const message = copy.required;
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
      onSuccess?.(observation, copy.recorded(formatCowIdentity({ name: resolvedCow.name, earTag: resolvedCow.earTag })));
    } catch (error) {
      const message = getApiErrorMessage(error, copy.failed);
      onError?.(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.cow}</label>
        <select className="input-machined w-full" value={cowId} onChange={(event) => setCowId(event.target.value)} required>
          <option value="">{copy.selectCow}</option>
          {herdOptions.map((cow) => <option key={cow.id} value={cow.id}>{cow.display}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.observedAt}</label>
          <input type="datetime-local" className="input-machined w-full" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.intensity}</label>
          <select className="input-machined w-full" value={intensity} onChange={(event) => setIntensity(event.target.value)}>
            <option value="LOW">{breedingCopy.intensities.LOW}</option>
            <option value="MEDIUM">{breedingCopy.intensities.MEDIUM}</option>
            <option value="HIGH">{breedingCopy.intensities.HIGH}</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.signs}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {HEAT_SIGNS.map((value) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-ink/10 p-3 text-sm font-semibold text-ink-strong">
              <input type="checkbox" checked={signs.includes(value)} onChange={() => toggleSign(value)} />
              {breedingCopy.heatSigns[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.notes}</label>
        <textarea className="input-machined min-h-24 w-full" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      <button type="submit" disabled={isSaving} className="btn-command w-full py-2.5 text-sm disabled:opacity-50">
        {isSaving ? copy.recording : copy.submit}
      </button>
    </form>
  );
}
