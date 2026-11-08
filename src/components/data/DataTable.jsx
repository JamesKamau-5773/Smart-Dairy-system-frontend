/* eslint-disable react-refresh/only-export-components */
// Column definitions are the one source for the header, the data rows and the group
// rows, so a total always sits in the same column as the values it sums.
//
// column: { id, header, align?: 'left' | 'right', width?: Tailwind width class, mono?: boolean }

const ALIGN = { left: 'text-left', right: 'text-right' };

/** Classes for a cell in `column`. Global CSS makes right-aligned cells monospace; only money keeps that. */
export const cellClass = (column, extra = '') => [
  'px-2 first:pl-3 last:pr-3 sm:first:pl-4 sm:last:pr-3',
  ALIGN[column.align ?? 'left'],
  column.mono ? '' : '!font-sans',
  extra,
].filter(Boolean).join(' ');

/** <colgroup> + <thead>. Widths come from the column definitions. */
export function TableHead({ columns }) {
  return (
    <>
      <colgroup>
        {columns.map((column) => <col key={column.id} className={column.width ?? ''} />)}
      </colgroup>
      <thead>
        <tr className="border-b border-ink/10 bg-ink-50">
          {columns.map((column) => (
            <th key={column.id} scope="col" className={cellClass(column, 'text-[10px] font-semibold uppercase tracking-wider text-ink-muted')}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
