import { staffCopy } from '../../i18n/staff';

/**
 * Whether payroll deducts PAYE, NSSF, SHIF and the Housing Levy for one employee.
 * The backend works out the amounts; this only switches them on or off.
 */
export default function StatutoryDeductionsToggle({ checked, onChange, className = '' }) {
  return (
    <label className={`flex items-start gap-3 rounded-md border border-ink/15 bg-card p-3 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-body-strong text-ink">{staffCopy.statutory.label}</span>
        <span className="mt-0.5 block text-meta text-ink-muted">
          {staffCopy.statutory.hint}
        </span>
      </span>
    </label>
  );
}
