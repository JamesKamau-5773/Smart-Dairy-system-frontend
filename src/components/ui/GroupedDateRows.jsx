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

function GroupHeader({ level, label, items, isOpen, onToggle, renderGroupMeta, colSpan, dateRowClassName }) {
  const padding = level === 'year' ? 'px-5 py-3' : level === 'month' ? 'px-7 py-2.5' : 'px-9 py-2';
  const styles = level === 'year'
    ? 'bg-brand/10 text-brand text-sm font-bold'
    : level === 'month'
      ? 'bg-brand/5 text-brand text-xs font-bold'
      : dateRowClassName || 'bg-surface-raised text-ink text-xs font-semibold';

  return (
    <tr className={styles}>
      <td colSpan={colSpan} className={padding}>
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            {isOpen ? <ChevronDown size={level === 'year' ? 16 : 14} /> : <ChevronRight size={level === 'year' ? 16 : 14} />}
            {label}
          </span>
          <span className="text-[11px] font-medium text-ink-muted">
            {renderGroupMeta ? renderGroupMeta(items, level) : `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </button>
      </td>
    </tr>
  );
}

export default function GroupedDateRows({ items, getDate, renderItem, renderGroupMeta, colSpan = 1, empty, dateRowClassName }) {
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
        <GroupHeader level="year" label={yearGroup.year} items={yearItems} isOpen={yearOpen} onToggle={() => toggle(yearKey)} renderGroupMeta={renderGroupMeta} colSpan={colSpan} />
        {yearOpen && yearGroup.months.map((monthGroup) => {
          const monthKey = `${yearKey}/${monthGroup.month}`;
          const monthItems = monthGroup.dates.flatMap((date) => date.items);
          const monthOpen = expanded.has(monthKey);

          return (
            <Fragment key={monthKey}>
              <GroupHeader level="month" label={monthGroup.month} items={monthItems} isOpen={monthOpen} onToggle={() => toggle(monthKey)} renderGroupMeta={renderGroupMeta} colSpan={colSpan} />
              {monthOpen && monthGroup.dates.map((dateGroup) => {
                const dateKey = `${monthKey}/${dateGroup.date}`;
                const dateOpen = expanded.has(dateKey);
                const dateLabel = dateGroup.date === UNKNOWN_DATE
                  ? 'Unknown date'
                  : new Date(`${dateGroup.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <Fragment key={dateKey}>
                    <GroupHeader level="date" label={dateLabel} items={dateGroup.items} isOpen={dateOpen} onToggle={() => toggle(dateKey)} renderGroupMeta={renderGroupMeta} colSpan={colSpan} dateRowClassName={dateRowClassName} />
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
