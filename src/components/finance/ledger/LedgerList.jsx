import { useMemo, useState } from 'react';
import { buildGroupTree, defaultOpenKeys, expandAll } from '../../../lib/groupTree';
import { TABLE_GROUP_LEVELS } from '../../../lib/periodTotals';
import { todayLocalIso } from '../../../lib/localDate';
import { bucketOf, categoryLabeler } from '../../../lib/ledgerRecord';
import { ledgerGroupConfig } from '../../periods/periodConfigs';
import { CardSkeletons, ListLoadMessage, SlowLoadingHint, StaleDataNotice } from '../../ui/ListLoadState';
import { commonCopy } from '../../../i18n/common';
import { financeCopy } from '../../../i18n/finance';
import LedgerListMonthHeader from './LedgerListMonthHeader';
import LedgerListDayHeader from './LedgerListDayHeader';
import LedgerListRow from './LedgerListRow';

/**
 * The Ledger's records on phones and tablets: one card, months that open and close, sticky
 * day headers, and two-line rows that open the record's sheet. The same data as LedgerTable:
 * the rows, and the group totals from the API (grouped by lib/groupTree, never added up here).
 *
 * rows:        useLedgerData().rows            groupTotals: useLedgerData().groupTotals
 * categories:  useLedgerCategories() lists     onRowSelect: (tx, rowElement) → void
 * showYear:    false when the range is within one year (months are then the top level)
 * empty:       what to show when nothing matches
 */
export default function LedgerList({ rows, groupTotals, categories, onRowSelect, showYear, empty }) {
  const categoryText = categoryLabeler(categories);
  const tree = useMemo(
    () => buildGroupTree(rows.items, bucketOf, groupTotals.data, TABLE_GROUP_LEVELS),
    [rows.items, groupTotals.data],
  );
  const display = useMemo(() => expandAll(tree.roots, ledgerGroupConfig.groupLabel), [tree]);
  const [openKeys, setOpenKeys] = useState(null);
  const open = openKeys ?? defaultOpenKeys(tree, todayLocalIso());
  const toggle = (key) => setOpenKeys(() => {
    const next = new Set(open);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const [singular, plural] = ledgerGroupConfig.noun;
  const describe = (totals) => {
    if (!totals) return commonCopy.groups.totalsUnavailable;
    const count = totals.count == null ? commonCopy.groups.countUnavailable : `${totals.count} ${totals.count === 1 ? singular : plural}`;
    return `${count}, ${ledgerGroupConfig.describeSummary(totals)}`;
  };

  const loadState = rows.loadState;
  if (loadState === 'offline' || loadState === 'error') {
    return <ListLoadMessage state={loadState} label={financeCopy.ledger.listLabel} error={rows.error} onRetry={rows.refetch} />;
  }
  if (loadState === 'loading') {
    return (
      <div aria-busy="true">
        <SlowLoadingHint label={financeCopy.ledger.listLabel} />
        <div className="divide-y divide-ink/10"><CardSkeletons /></div>
      </div>
    );
  }
  if (rows.items.length === 0) return <div className="p-6 text-center text-body text-ink-muted">{empty}</div>;

  const renderRecords = (records) => (
    <div className="divide-y divide-ink/10">
      {records.map((tx) => <LedgerListRow key={tx.id} tx={tx} categoryText={categoryText} onSelect={onRowSelect} />)}
    </div>
  );

  const renderDay = (day) => (
    <section key={day.key} aria-label={day.label}>
      <LedgerListDayHeader label={day.label} totals={day.totals} />
      {day.records.length > 0 ? renderRecords(day.records) : <p className="m-0 px-4 py-3 text-meta text-ink-muted">{commonCopy.groups.emptyDay}</p>}
    </section>
  );

  const renderGroup = (node, { tinted }) => (
    <section key={node.key} aria-label={node.label}>
      <LedgerListMonthHeader
        label={node.label}
        totals={node.totals}
        isOpen={open.has(node.key)}
        onToggle={() => toggle(node.key)}
        description={describe(node.totals)}
        groupKey={node.key}
        tinted={tinted}
      />
      {open.has(node.key) && node.children.map((child) => (child.level === 'day'
        ? renderDay(child)
        : renderGroup(child, { tinted: false })))}
    </section>
  );

  // Within one year the year adds nothing: its months are the top level.
  const topLevel = showYear ? display : display.flatMap((node) => (node.level === 'year' ? node.children : [node]));

  return (
    <div>
      {loadState === 'stale' && <StaleDataNotice label={financeCopy.ledger.listLabel} error={rows.error} onRetry={rows.refetch} />}
      {(groupTotals.loadState === 'error' || groupTotals.loadState === 'offline') && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-ink-50 px-4 py-2 text-meta text-ink-muted">
          <span>{commonCopy.groups.totalsFailed}</span>
          <button type="button" onClick={() => groupTotals.refetch?.()} className="inline-flex min-h-11 items-center text-control text-brand hover:underline">
            {commonCopy.list.tryAgain}
          </button>
        </div>
      )}
      {topLevel.map((node) => renderGroup(node, { tinted: true }))}
      {tree.ungrouped.length > 0 && (
        <section aria-label={commonCopy.groups.ungrouped}>
          <LedgerListDayHeader label={commonCopy.groups.ungrouped} totals={null} />
          {renderRecords(tree.ungrouped)}
        </section>
      )}
    </div>
  );
}
