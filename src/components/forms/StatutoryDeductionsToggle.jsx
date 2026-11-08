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
        <span className="block text-sm font-semibold text-ink">Deduct PAYE, NSSF, SHIF and Housing Levy</span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          On for most employees. Turn off only for someone these don’t apply to, such as a casual worker paid by the day.
          Changes apply from the next payroll you create.
        </span>
      </span>
    </label>
  );
}
