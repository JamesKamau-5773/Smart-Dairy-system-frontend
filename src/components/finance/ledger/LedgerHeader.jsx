/**
 * The Ledger's header: the page title and subtitle, and its two actions. "Log income" is the
 * page's one primary button, on the right; "Log expense" is outlined.
 * From xl (the table layout): a tinted panel with the actions top-right. Below xl: no panel,
 * and the actions under the subtitle in two equal columns, 48px tall.
 */
export default function LedgerHeader({ title, subtitle, incomeLabel, expenseLabel, onLogIncome, onLogExpense }) {
  return (
    <header className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-x-4 xl:rounded-input xl:border xl:border-ink/10 xl:bg-brand-50 xl:px-5 xl:py-4">
      <div className="min-w-0">
        <h1 className="m-0 text-page-title text-ink">{title}</h1>
        <p className="mt-0.5 text-body text-ink-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center xl:gap-2">
        <button type="button" onClick={onLogExpense} className="btn-outline-brand min-h-12 px-4 xl:min-h-11">{expenseLabel}</button>
        <button type="button" onClick={onLogIncome} className="btn-command min-h-12 px-4 xl:min-h-11">{incomeLabel}</button>
      </div>
    </header>
  );
}
