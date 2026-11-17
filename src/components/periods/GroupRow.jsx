import { ChevronRight } from 'lucide-react';
import { cellClass } from '../data/DataTable';
import { LEVEL_INDENT, LEVEL_STYLES } from './groupLevels';

const missing = <span className="font-mono text-sm text-ink-muted">—</span>;

// A page's group config may restyle the levels (`levelStyles`, `levelIndent`, by level) and
// the chevron (`chevronClassName`); otherwise the shared brand style applies.
const levelStyle = (config, level) => config?.levelStyles?.[level] ?? LEVEL_STYLES[level];
const levelIndent = (config, level) => config?.levelIndent?.[level] ?? LEVEL_INDENT[level];

function Toggle({ node, config, isOpen, onToggle, ariaLabel, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      data-group-key={node.key}
      data-group-keys={node.keys.join(' ')}
      className={`flex w-full min-w-0 items-center gap-2 !rounded-none text-left ${levelIndent(config, node.level)} ${className}`}
    >
      <ChevronRight
        size={node.level === 'year' ? 16 : 14}
        aria-hidden="true"
        className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''} ${config?.chevronClassName ?? ''}`}
      />
      {children}
    </button>
  );
}

/**
 * Desktop group row, one line (~44px). The label cell spans the columns before the
 * first total; each total sits in its own column (config.columnTotals, keyed by column
 * id), right-aligned like the row values; later columns stay empty.
 *
 * config: { columnTotals: { [columnId]: (totals) => node }, labelMeta?(totals) => node,
 *           cellClassName?: extra classes for the total cells (to match the page's data cells) }
 */
export function GroupRowTable({ node, columns, config, isOpen, onToggle, ariaLabel, sticky = '' }) {
  const totalIds = Object.keys(config.columnTotals ?? {});
  const firstTotal = columns.findIndex((column) => totalIds.includes(column.id));
  const span = firstTotal < 0 ? columns.length : Math.max(firstTotal, 1);
  const cell = `!py-0 ${sticky} ${levelStyle(config, node.level)}`;

  return (
    <tr className="h-11 border-b border-ink/10">
      <td colSpan={span} className={`p-0 ${cell}`}>
        <Toggle node={node} config={config} isOpen={isOpen} onToggle={onToggle} ariaLabel={ariaLabel} className="h-11 pr-3">
          <span className="min-w-0 truncate">{node.label}</span>
          {node.totals && config.labelMeta ? config.labelMeta(node.totals) : (!node.totals && <span className="ml-auto pl-2">{missing}</span>)}
        </Toggle>
      </td>
      {firstTotal >= 0 && columns.slice(span).map((column) => {
        const render = config.columnTotals[column.id];
        return (
          <td key={column.id} className={cellClass(column, `${cell} ${config.cellClassName ?? ''}`)} aria-hidden="true">
            {render ? (node.totals ? render(node.totals) : missing) : null}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Phone group header: [chevron] label ········ summary (config.renderSummary).
 * Only the label truncates; the summary never shrinks.
 */
export function GroupRowCard({ node, config, isOpen, onToggle, ariaLabel, sticky = '' }) {
  return (
    <div className={`${levelStyle(config, node.level)} ${sticky}`}>
      <Toggle node={node} config={config} isOpen={isOpen} onToggle={onToggle} ariaLabel={ariaLabel} className="min-h-11 border-b border-ink/10 py-1.5 pr-3 sm:pr-4">
        <span className="min-w-0 truncate">{node.label}</span>
        <span className="ml-auto max-w-[68%] shrink-0 pl-2 text-right" aria-hidden="true">
          {node.totals ? config.renderSummary(node.totals) : missing}
        </span>
      </Toggle>
    </div>
  );
}
