import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { useLedgerData } from '../../hooks/useLedgerData';
import { useLedgerFilters } from '../../hooks/useLedgerFilters';
import { useLedgerRecordActions } from '../../hooks/useLedgerRecordActions';
import { todayLocalIso } from '../../lib/localDate';
import { formatCount } from '../../lib/numberFormat';
import DataSection from '../../components/data/DataSection';
import FilterPanel from '../../components/data/FilterPanel';
import KpiGroup from '../../components/data/KpiGroup';
import InfoTip from '../../components/ui/InfoTip';
import ReceiptPreview from '../../components/finance/ReceiptPreview';
import LedgerEntryFormModal from '../../components/finance/LedgerEntryFormModal';
import LedgerCorrectionModal from '../../components/finance/LedgerCorrectionModal';
import ReceiptPhotosModal from '../../components/finance/ReceiptPhotosModal';
import LedgerHeader from '../../components/finance/ledger/LedgerHeader';
import LedgerFilters from '../../components/finance/ledger/LedgerFilters';
import LedgerTable from '../../components/finance/ledger/LedgerTable';
import LedgerList from '../../components/finance/ledger/LedgerList';
import TransactionSheet from '../../components/finance/ledger/TransactionSheet';
import { TABLE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { LEDGER_KPI_ROWS, ledgerReportRoute } from '../../components/finance/ledger/ledgerKpiConfig';
import { summaryScope } from '../../components/periods/periodConfigs';
import { financeCopy } from '../../i18n/finance';

/**
 * /finance/ledger. Composition only: the hooks supply filters, data and record actions, and
 * the components lay them out (header, KPI cards, filter panel, grouped table, dialogs).
 */
const FinancialLedger = () => {
  const copy = financeCopy.ledger;
  const { tenantId, farmId } = useTenant();
  const today = todayLocalIso();
  const categories = useLedgerCategories(tenantId, farmId);
  const filters = useLedgerFilters({ today });
  const { rows, kpis, groupTotals } = useLedgerData({ filters: filters.query, range: filters.range });
  const actions = useLedgerRecordActions();
  const [entryFormType, setEntryFormType] = useState(null);
  // The table from xl up; below it the list, whose rows open a record's sheet.
  const isTable = useMediaQuery(TABLE_QUERY);
  const [selected, setSelected] = useState(null);
  const empty = filters.activeCount > 0 ? copy.noMatches : copy.empty;

  const resultsSummary = rows.total != null && (
    <p role="status" className="flex flex-wrap items-center gap-1">
      <span>{copy.showing(rows.total, formatCount(rows.total))}</span>
      <InfoTip topic={copy.kpis.label}>{copy.resultsInfo}</InfoTip>
    </p>
  );

  return (
    <div className="mx-auto max-w-7xl animate-reveal space-y-4">
      <LedgerHeader
        title={copy.heading}
        subtitle={copy.subtitle}
        incomeLabel={copy.logIncome}
        expenseLabel={copy.logExpense}
        onLogIncome={() => setEntryFormType('income')}
        onLogExpense={() => setEntryFormType('expense')}
      />

      <KpiGroup
        label={copy.kpis.label}
        rows={LEDGER_KPI_ROWS}
        values={kpis.data}
        scope={summaryScope(filters.range, { isDefault: filters.isDefaultRange, short: !isTable })}
        reportTo={ledgerReportRoute(filters.range)}
        loadState={kpis.loadState}
        error={kpis.error}
        onRetry={kpis.refetch}
        layout={isTable ? 'tiles' : 'list'}
      />

      <FilterPanel title={copy.filtersTitle} activeCount={filters.activeCount} onReset={filters.reset} resultsSummary={resultsSummary}>
        <LedgerFilters filters={filters} categories={categories} maxDate={today} layout={isTable ? 'row' : 'stacked'} />
      </FilterPanel>

      <DataSection
        label={copy.recordsLabel}
        notices={rows.searchScope?.typo_matched && (
          <p role="status" className="border-b border-ink/10 bg-ink-50 px-4 py-2 text-body text-ink">
            {copy.typoMatch(rows.searchScope.search_query, rows.searchScope.matched_names?.join(', '))}
          </p>
        )}
      >
        {isTable ? (
          <LedgerTable
            rows={rows}
            groupTotals={groupTotals}
            categories={categories}
            menuItemsFor={actions.menuItemsFor}
            onOpenReceipt={actions.openReceipt}
            empty={empty}
          />
        ) : (
          <LedgerList
            rows={rows}
            groupTotals={groupTotals}
            categories={categories}
            onRowSelect={setSelected}
            showYear={filters.range.from.slice(0, 4) !== filters.range.to.slice(0, 4)}
            empty={empty}
          />
        )}
      </DataSection>

      {!isTable && (
        <TransactionSheet
          tx={selected}
          categories={categories}
          menuItems={selected ? actions.menuItemsFor(selected) : []}
          onViewReceipt={actions.openReceipt}
          onClose={() => setSelected(null)}
        />
      )}

      {entryFormType && (
        <LedgerEntryFormModal
          key={entryFormType}
          onClose={() => setEntryFormType(null)}
          transactionType={entryFormType}
          farmId={farmId}
          tenantId={tenantId}
        />
      )}

      {actions.correction.transaction && (
        <LedgerCorrectionModal
          kind={actions.correction.kind}
          transaction={actions.correction.transaction}
          onClose={actions.correction.close}
          onSubmit={actions.correction.submit}
          isPending={actions.correction.isPending}
          error={actions.correction.error}
          tenantId={tenantId}
          farmId={farmId}
        />
      )}

      {actions.photos.transaction && (
        <ReceiptPhotosModal
          transaction={rows.items.find((tx) => tx.id === actions.photos.transaction.id) ?? actions.photos.transaction}
          title={actions.photos.title}
          canUpload={actions.photos.canUpload}
          onClose={actions.photos.close}
          onUploaded={actions.photos.onUploaded}
        />
      )}

      {actions.receipt.value && (
        <ReceiptPreview
          receipt={actions.receipt.value}
          isOpen
          onClose={actions.receipt.close}
          onDownload={actions.receipt.download}
          onShare={actions.receipt.share}
          isDownloading={actions.receipt.isDownloading}
        />
      )}
    </div>
  );
};

export default FinancialLedger;
