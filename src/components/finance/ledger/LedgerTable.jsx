import { useState } from 'react';
import GroupedDataTable from '../../data/GroupedDataTable';
import { ledgerGroupConfig } from '../../periods/periodConfigs';
import { bucketOf, categoryLabeler } from '../../../lib/ledgerRecord';
import { LEDGER_COLUMNS } from './ledgerTableConfig';
import { LedgerTableRow } from './LedgerRow';

// The page shows LedgerList below the table breakpoint, so the table has no card view.
const noCard = () => null;
import { ledgerCopy } from '../../../i18n/ledger';
import { financeCopy } from '../../../i18n/finance';

// Headers are read at render, so they follow the chosen language.
const columnsWithHeaders = () => LEDGER_COLUMNS.map((entry) => ({
  ...entry,
  header: entry.srOnly ? <span className="sr-only">{ledgerCopy.columns[entry.id]}</span> : ledgerCopy.columns[entry.id],
}));

/**
 * The Ledger's records, grouped Year → Month → Day with the API's group totals. Owns which
 * rows are open; the page supplies the data and the actions.
 *
 * rows:          useLedgerData().rows
 * groupTotals:   useLedgerData().groupTotals
 * categories:    { income, expense } as [[code, label]] (useLedgerCategories)
 * menuItemsFor:  (tx) → ⋮ items           onOpenReceipt: (tx) → void
 * empty:         what to show when nothing matches
 */
export default function LedgerTable({ rows, groupTotals, categories, menuItemsFor, onOpenReceipt, empty }) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const columns = columnsWithHeaders();
  const categoryText = categoryLabeler(categories);
  const toggle = (id) => setOpenIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const rowProps = (tx) => ({
    tx,
    expanded: openIds.has(tx.id),
    onToggle: () => toggle(tx.id),
    categoryText,
    menuItems: menuItemsFor(tx),
    onOpenReceipt,
  });

  return (
    <GroupedDataTable
      columns={columns}
      rows={rows.items}
      getBucket={bucketOf}
      groups={groupTotals.data}
      groupsUnavailable={groupTotals.loadState === 'error' || groupTotals.loadState === 'offline'}
      onRetryGroups={groupTotals.refetch}
      config={ledgerGroupConfig}
      renderRow={(tx) => <LedgerTableRow key={tx.id} columns={columns} {...rowProps(tx)} />}
      renderCard={noCard}
      loadState={rows.loadState}
      error={rows.error}
      onRetry={rows.refetch}
      rowsLabel={financeCopy.ledger.listLabel}
      empty={empty}
    />
  );
}
