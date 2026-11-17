import StatutoryDeductionsToggle from '../StatutoryDeductionsToggle';
import { staffCopy } from '../../../i18n/staff';

export default function FinancialsTab({ financialData, setFinancialData, onSubmit, onClose }) {
  const copy = staffCopy.drawer;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 rounded-md border border-ink/15 bg-card p-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-field-label text-ink-muted">{copy.baseSalary}</span>
          <input
            type="number"
            min="0"
            value={financialData.baseSalary}
            onChange={(event) => setFinancialData((current) => ({ ...current, baseSalary: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-control text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-field-label text-ink-muted">{copy.advance}</span>
          <input
            type="number"
            min="0"
            value={financialData.advanceAmount}
            onChange={(event) => setFinancialData((current) => ({ ...current, advanceAmount: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-control text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <span className="block text-meta text-ink-muted">{copy.advanceHint}</span>
        </label>

        <label className="space-y-1.5">
          <span className="text-field-label text-ink-muted">{copy.monthlyDeduction}</span>
          <input
            type="number"
            min="0"
            value={financialData.monthlyDeduction}
            onChange={(event) => setFinancialData((current) => ({ ...current, monthlyDeduction: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-control text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        {typeof financialData.statutoryDeductionsEnabled === 'boolean' && (
          <StatutoryDeductionsToggle
            className="sm:col-span-2"
            checked={financialData.statutoryDeductionsEnabled}
            onChange={(statutoryDeductionsEnabled) => setFinancialData((current) => ({ ...current, statutoryDeductionsEnabled }))}
          />
        )}

        <div className="sm:col-span-2 grid gap-3 rounded-md border border-ink/15 bg-ink-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-label text-ink-muted">{copy.loanBalance}</p>
            <p className="mt-1 text-body-strong text-ink">KES {financialData.loanBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-label text-ink-muted">{copy.repaymentRate}</p>
            <p className="mt-1 text-body-strong text-ink">KES {Number(financialData.monthlyDeduction || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-label text-ink-muted">{copy.advanceThisMonth}</p>
            <p className="mt-1 text-body-strong text-ink">KES {Number(financialData.advanceAmount || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-ink/15 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-ink/15 bg-card px-4 py-2 text-control text-ink-muted transition-colors hover:bg-ink-50"
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-control text-white transition-colors hover:bg-brand-dark"
        >
          {copy.applyFinancials}
        </button>
      </div>
    </form>
  );
}