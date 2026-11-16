import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ancestorKeys, buildGroupTree, defaultOpenKeys, expandAll } from '../../lib/groupTree';
import { GROUP_LEVELS } from '../../lib/periodTotals';
import { todayLocalIso } from '../../lib/localDate';
import { GroupRowCard, GroupRowTable } from './GroupRow';
import { LEVEL_STYLES } from './groupLevels';
import { commonCopy } from '../../i18n/common';

/**
 * Records grouped by date (the page's `config.levels`) using `record.bucket` keys.
 * Header totals come from the group-totals endpoint, looked up by key, never from rows.
 *
 * config: {
 *   levels?: ['year', 'month', 'day'],
 *   noun: [singular, plural], describeSummary(totals) → string,
 *   columnTotals: { [columnId]: (totals) → node }, labelMeta?(totals) → node   (table)
 *   renderSummary(totals) → node                                              (cards)
 * }
 * variant: 'cards' (div list) or 'table' (rows inside a <tbody>; pass `columns`).
 * focus: { key, nonce } opens that group and scrolls to it.
 */
export default function GroupedList({
  records,
  getBucket,
  groups,
  groupsUnavailable = false,
  onRetryGroups,
  config,
  renderRecord,
  variant = 'cards',
  columns = [],
  focus,
}) {
  const containerRef = useRef(null);
  const levels = config.levels ?? GROUP_LEVELS;
  const tree = useMemo(() => buildGroupTree(records, getBucket, groups, levels), [records, getBucket, groups, levels]);
  const display = useMemo(() => expandAll(tree.roots), [tree]);
  // Every key a display node stands for → that node's key.
  const displayKeyOf = useMemo(() => {
    const map = new Map();
    const walk = (node) => {
      node.keys.forEach((key) => map.set(key, node.key));
      node.children.forEach(walk);
    };
    display.forEach(walk);
    return map;
  }, [display]);

  const [expanded, setExpanded] = useState(null);
  const open = useMemo(() => expanded ?? defaultOpenKeys(tree, todayLocalIso()), [expanded, tree]);
  const toggle = (key) => setExpanded(() => {
    const next = new Set(open);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // A new focus request (a tapped chart bar) opens that group and its parents.
  const [handledFocus, setHandledFocus] = useState(null);
  if (focus && focus !== handledFocus && displayKeyOf.has(focus.key)) {
    setHandledFocus(focus);
    const shown = displayKeyOf.get(focus.key);
    setExpanded(new Set([...open, ...ancestorKeys(tree.nodes, focus.key), ...ancestorKeys(tree.nodes, shown)]));
  }

  useEffect(() => {
    if (!handledFocus?.key) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const root = variant === 'table' ? containerRef.current?.closest('table') : containerRef.current;
      root?.querySelector(`[data-group-keys~="${CSS.escape(handledFocus.key)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [handledFocus, variant]);

  const [singular, plural] = config.noun;
  const ariaLabel = (node) => {
    const count = node.totals?.count ?? null;
    const description = node.totals ? config.describeSummary(node.totals) : commonCopy.groups.totalsUnavailable;
    return `${node.label}, ${count == null ? commonCopy.groups.countUnavailable : `${count} ${count === 1 ? singular : plural}`}, ${description}`;
  };
  const rowProps = (node) => ({ node, config, isOpen: open.has(node.key), onToggle: () => toggle(node.key), ariaLabel: ariaLabel(node) });

  const emptyDay = (node) => (node.records.length === 0
    ? <p className="px-4 py-3 text-xs text-ink-muted">{commonCopy.groups.emptyDay}</p>
    : null);

  // Offsets match the page scroller's padding (p-4 sm:p-6 md:p-8) so the header meets the app bar.
  const sticky = (level) => (level === 'month' ? 'sticky -top-4 z-10 sm:-top-6 md:-top-8' : '');

  const renderCards = (node) => (
    <section key={node.key} aria-label={node.label}>
      <GroupRowCard {...rowProps(node)} sticky={sticky(node.level)} />
      {open.has(node.key) && (node.level === 'day'
        ? <div className="divide-y divide-ink/10 border-b border-ink/10">{node.records.map((record) => renderRecord(record))}{emptyDay(node)}</div>
        : node.children.map(renderCards))}
    </section>
  );

  const renderRows = (node) => (
    <Fragment key={node.key}>
      <GroupRowTable {...rowProps(node)} columns={columns} sticky={sticky(node.level)} />
      {open.has(node.key) && (node.level === 'day'
        ? (node.records.length ? node.records.map((record) => renderRecord(record)) : <tr><td colSpan={columns.length}>{emptyDay(node)}</td></tr>)
        : node.children.map(renderRows))}
    </Fragment>
  );

  const groupsNotice = groupsUnavailable && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-ink-50 px-4 py-2 text-xs text-ink-muted">
      <span>{commonCopy.groups.totalsFailed}</span>
      {onRetryGroups && (
        <button type="button" onClick={() => onRetryGroups()} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
          <RefreshCw size={12} aria-hidden="true" /> {commonCopy.list.tryAgain}
        </button>
      )}
    </div>
  );

  const ungroupedLabel = commonCopy.groups.ungrouped;

  if (variant === 'table') {
    return (
      <>
        {groupsNotice && <tr ref={containerRef}><td colSpan={columns.length} className="p-0">{groupsNotice}</td></tr>}
        {!groupsNotice && <tr ref={containerRef} aria-hidden="true" className="hidden" />}
        {display.map(renderRows)}
        {tree.ungrouped.length > 0 && (
          <>
            <tr className={LEVEL_STYLES.day}><td colSpan={columns.length} className="px-4 py-2 text-xs font-semibold text-ink-muted">{ungroupedLabel}</td></tr>
            {tree.ungrouped.map((record) => renderRecord(record))}
          </>
        )}
      </>
    );
  }

  return (
    <div ref={containerRef}>
      {groupsNotice}
      {display.map(renderCards)}
      {tree.ungrouped.length > 0 && (
        <section aria-label={ungroupedLabel}>
          <p className={`${LEVEL_STYLES.day} border-b border-ink/10 px-4 py-2 text-ink-muted`}>{ungroupedLabel}</p>
          <div className="divide-y divide-ink/10">{tree.ungrouped.map((record) => renderRecord(record))}</div>
        </section>
      )}
    </div>
  );
}
