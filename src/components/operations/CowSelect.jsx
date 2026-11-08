import { formatCowIdentity } from '../../lib/cowIdentity';
import { safetyCopy as copy } from '../../i18n/safety.en';

/** A labelled select of the farm's cows, by name and ear tag. */
export default function CowSelect({ id, cows, value, onChange, disabled = false }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink">{copy.cow}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="input-machined w-full text-sm" required>
        <option value="">{copy.chooseCow}</option>
        {cows.map((cow) => <option key={cow.id} value={cow.id}>{formatCowIdentity(cow)}</option>)}
      </select>
    </div>
  );
}
