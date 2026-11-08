import StatutoryDeductionsToggle from '../StatutoryDeductionsToggle';

export default function FinancialsTab({ financialData, setFinancialData, onSubmit, onClose }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 rounded-md border border-ink/15 bg-card p-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Base salary (KES)</span>
          <input
            type="number"
            min="0"
            value={financialData.baseSalary}
            onChange={(event) => setFinancialData((current) => ({ ...current, baseSalary: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Advance amount (KES)</span>
          <input
            type="number"
            min="0"
            value={financialData.advanceAmount}
            onChange={(event) => setFinancialData((current) => ({ ...current, advanceAmount: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <span className="block text-xs text-ink-muted">Also recorded in the ledger as Labour / Wages: Salary advance.</span>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Monthly deduction (KES)</span>
          <input
            type="number"
            min="0"
            value={financialData.monthlyDeduction}
            onChange={(event) => setFinancialData((current) => ({ ...current, monthlyDeduction: event.target.value }))}
            className="w-full rounded-md border border-ink/15 bg-card px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
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
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Current loan balance</p>
            <p className="mt-1 text-lg font-semibold text-ink">KES {financialData.loanBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Repayment rate</p>
            <p className="mt-1 text-lg font-semibold text-ink">KES {Number(financialData.monthlyDeduction || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Advance this month</p>
            <p className="mt-1 text-lg font-semibold text-ink">KES {Number(financialData.advanceAmount || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-ink/15 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-ink/15 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted transition-colors hover:bg-ink-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-brand-dark"
        >
          Apply financial changes
        </button>
      </div>
    </form>
  );
}