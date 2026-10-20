import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const UNKNOWN_DATE = 'unknown';

function getDateParts(value) {
  const raw = String(value ?? '').slice(0, 10);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { year: 'Unknown year', month: 'Unknown month', date: UNKNOWN_DATE };
  }

  return {
    year: String(parsed.getFullYear()),
    month: parsed.toLocaleDateString(undefined, { month: 'long' }),
    date: raw || parsed.toISOString().slice(0, 10),
  };
}

function buildGroups(items, getDate) {
  const years = new Map();

  items.forEach((item) => {
    const parts = getDateParts(getDate(item));
    if (!years.has(parts.year)) years.set(parts.year, new Map());
    const months = years.get(parts.year);
    if (!months.has(parts.month)) months.set(parts.month, new Map());
    const dates = months.get(parts.month);
    if (!dates.has(parts.date)) dates.set(parts.date, []);
    dates.get(parts.date).push(item);
  });

  return [...years.entries()]
    .sort(([left], [right]) => right.localeCompare(left, undefined, { numeric: true }))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort(([left], [right]) => new Date(`${right} 1, ${year}`) - new Date(`${left} 1, ${year}`))
        .map(([month, dates]) => ({
          month,
          dates: [...dates.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([date, dateItems]) => ({ date, items: dateItems })),
        })),
    }));
}

function GroupHeader({ level, label, items, isOpen, onToggle, renderGroupMeta, renderGroupCount, renderGroupTotal, labelColSpan, colSpan, dateRowClassName, yearRowClassName, monthRowClassName }) {
  const padding = level === 'year' ? 'px-5 py-3' : level === 'month' ? 'px-7 py-2.5' : 'px-9 py-2';
  const styles = level === 'year'
    ? yearRowClassName || 'bg-brand/10 text-brand text-sm font-bold'
    : level === 'month'
      ? monthRowClassName || 'bg-brand/5 text-brand text-xs font-bold'
      : dateRowClassName || 'bg-surface-raised text-ink text-xs font-semibold';

  const groupCount = renderGroupCount ? renderGroupCount(items, level) : null;
  const content = (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left"
      aria-expanded={isOpen}
    >
      {isOpen ? <ChevronDown size={level === 'year' ? 16 : 14} /> : <ChevronRight size={level === 'year' ? 16 : 14} />}
      <span>{label}</span>
      {renderGroupCount && (
        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
          ({groupCount})
        </span>
      )}
      {!renderGroupTotal && !renderGroupCount && (
        <span className="ml-auto text-[11px] font-medium text-ink-muted">
          {renderGroupMeta ? renderGroupMeta(items, level) : `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`}
        </span>
      )}
    </button>
  );

  return (
    <tr className={styles}>
      {renderGroupTotal ? (
        <>
          <td colSpan={labelColSpan} className={padding}>{content}</td>
          <td className="p-4 text-right text-[11px] font-semibold tabular-nums">{renderGroupTotal(items, level)}</td>
          {colSpan - labelColSpan - 1 > 0 && <td colSpan={colSpan - labelColSpan - 1} />}
        </>
      ) : <td colSpan={colSpan} className={padding}>{content}</td>}
    </tr>
  );
}

export default function GroupedDateRows({ items, getDate, renderItem, renderGroupMeta, renderGroupCount, renderGroupTotal, colSpan = 1, labelColSpan = colSpan - 1, empty, dateRowClassName, yearRowClassName, monthRowClassName }) {
  const groups = useMemo(() => buildGroups(items, getDate), [items, getDate]);
  const latestKeys = groups[0] && groups[0].months[0]?.dates[0]
    ? [
      groups[0].year,
      `${groups[0].year}/${groups[0].months[0].month}`,
      `${groups[0].year}/${groups[0].months[0].month}/${groups[0].months[0].dates[0].date}`,
    ]
    : [];
  const [expanded, setExpanded] = useState(() => new Set(latestKeys));

  useEffect(() => {
    if (latestKeys.length > 0 && expanded.size === 0) setExpanded(new Set(latestKeys));
  }, [latestKeys, expanded.size]);

  const toggle = (key) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) return empty || null;

  return groups.map((yearGroup) => {
    const yearItems = yearGroup.months.flatMap((month) => month.dates.flatMap((date) => date.items));
    const yearKey = yearGroup.year;
    const yearOpen = expanded.has(yearKey);

    return (
      <Fragment key={yearKey}>
        <GroupHeader level="year" label={yearGroup.year} items={yearItems} isOpen={yearOpen} onToggle={() => toggle(yearKey)} renderGroupMeta={renderGroupMeta} renderGroupCount={renderGroupCount} renderGroupTotal={renderGroupTotal} labelColSpan={labelColSpan} colSpan={colSpan} dateRowClassName={dateRowClassName} yearRowClassName={yearRowClassName} monthRowClassName={monthRowClassName} />
        {yearOpen && yearGroup.months.map((monthGroup) => {
          const monthKey = `${yearKey}/${monthGroup.month}`;
          const monthItems = monthGroup.dates.flatMap((date) => date.items);
          const monthOpen = expanded.has(monthKey);

          return (
            <Fragment key={monthKey}>
              <GroupHeader level="month" label={monthGroup.month} items={monthItems} isOpen={monthOpen} onToggle={() => toggle(monthKey)} renderGroupMeta={renderGroupMeta} renderGroupCount={renderGroupCount} renderGroupTotal={renderGroupTotal} labelColSpan={labelColSpan} colSpan={colSpan} dateRowClassName={dateRowClassName} yearRowClassName={yearRowClassName} monthRowClassName={monthRowClassName} />
              {monthOpen && monthGroup.dates.map((dateGroup) => {
                const dateKey = `${monthKey}/${dateGroup.date}`;
                const dateOpen = expanded.has(dateKey);
                const dateLabel = dateGroup.date === UNKNOWN_DATE
                  ? 'Unknown date'
                  : new Date(`${dateGroup.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <Fragment key={dateKey}>
                    <GroupHeader level="date" label={dateLabel} items={dateGroup.items} isOpen={dateOpen} onToggle={() => toggle(dateKey)} renderGroupMeta={renderGroupMeta} renderGroupCount={renderGroupCount} renderGroupTotal={renderGroupTotal} labelColSpan={labelColSpan} colSpan={colSpan} dateRowClassName={dateRowClassName} yearRowClassName={yearRowClassName} monthRowClassName={monthRowClassName} />
                    {dateOpen && dateGroup.items.map((item, index) => renderItem(item, index))}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
      </Fragment>
    );
  });
}

export { getDateParts };
