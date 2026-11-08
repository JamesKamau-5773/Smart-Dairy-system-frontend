import { feedCopy } from '../../i18n/feed.en';
import { QUANTITY_BASES } from '../../lib/recipeMeasurements';

const { mix: copy } = feedCopy;

const inputClass = 'w-full rounded-lg border border-ink/20 bg-surface-raised px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/40';
const labelClass = 'block text-[10px] font-black uppercase tracking-wider text-ink-muted';

function NumberField({ id, label, hint, value, error, onChange }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      {!error && hint && <p className="text-[10px] font-semibold text-ink-muted">{hint}</p>}
    </div>
  );
}

/** How a saved mix is measured out at feeding time (see lib/recipeMeasurements). */
export default function RecipeMeasurementFields({ measures, errors = {}, onChange }) {
  const set = (field) => (value) => onChange({ ...measures, [field]: value });

  return (
    <fieldset className="mb-4 space-y-3 rounded-lg border border-ink/10 p-3">
      <legend className="px-1 text-xs font-black text-ink-strong">{copy.measuresTitle}</legend>

      <div className="space-y-1">
        <label htmlFor="mix-quantity-basis" className={labelClass}>{copy.basis}</label>
        <select id="mix-quantity-basis" value={measures.quantity_basis} onChange={(event) => set('quantity_basis')(event.target.value)} className={inputClass}>
          {QUANTITY_BASES.map((basis) => <option key={basis} value={basis}>{copy.basisOptions[basis]}</option>)}
        </select>
      </div>

      {measures.quantity_basis === 'concentrate' && (
        <NumberField
          id="mix-concentrate-rate"
          label={copy.concentrateRate}
          hint={copy.concentrateRateHint}
          value={measures.concentrate_kg_per_head_day}
          error={errors.concentrate_kg_per_head_day}
          onChange={set('concentrate_kg_per_head_day')}
        />
      )}

      <p className="pt-1 text-[10px] font-black uppercase tracking-wider text-ink-muted">{copy.bucketTitle}</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="mix-bulk-density" label={copy.bulkDensity} value={measures.bulk_density_kg_per_litre} error={errors.bulk_density_kg_per_litre} onChange={set('bulk_density_kg_per_litre')} />
        <NumberField id="mix-bucket-volume" label={copy.bucketVolume} value={measures.bucket_volume_litres} error={errors.bucket_volume_litres} onChange={set('bucket_volume_litres')} />
      </div>
      <NumberField id="mix-scoop-weight" label={copy.scoopWeight} value={measures.scoop_weight_kg} error={errors.scoop_weight_kg} onChange={set('scoop_weight_kg')} />
    </fieldset>
  );
}
