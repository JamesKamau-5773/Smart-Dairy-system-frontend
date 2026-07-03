import React from 'react';

export default function FinancialsTab({ financialData, setFinancialData, onSubmit, onClose }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Base salary (KSh)</span>
          <input
            type="number"
            min="0"
            value={financialData.baseSalary}
            onChange={(event) => setFinancialData((current) => ({ ...current, baseSalary: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Advance amount (KSh)</span>
          <input
            type="number"
            min="0"
            value={financialData.advanceAmount}
            onChange={(event) => setFinancialData((current) => ({ ...current, advanceAmount: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monthly deduction (KSh)</span>
          <input
            type="number"
            min="0"
            value={financialData.monthlyDeduction}
            onChange={(event) => setFinancialData((current) => ({ ...current, monthlyDeduction: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <div className="sm:col-span-2 grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Current loan balance</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">KSh {financialData.loanBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Repayment rate</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">KSh {Number(financialData.monthlyDeduction || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Advance this month</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">KSh {Number(financialData.advanceAmount || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
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