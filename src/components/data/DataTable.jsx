/* eslint-disable react-refresh/only-export-components */
// Column definitions are the one source for the header, the data rows and the group
// rows, so a total always sits in the same column as the values it sums.
//
// column: { id, header, align?: 'left' | 'right', width?: Tailwind width class }

const ALIGN = { left: 'text-left', right: 'text-right' };

/** Classes for a cell in `column`. Every cell already uses tabular figures (src/index.css). */
export const cellClass = (column, extra = '') => [
  'px-2 first:pl-3 last:pr-3 sm:first:pl-4 sm:last:pr-3',
  ALIGN[column.align ?? 'left'],
  extra,
].filter(Boolean).join(' ');

/**
 * <colgroup> + <thead> in the brand header style: solid brand fill, white uppercase labels.
 * Widths come from the column definitions; use it in a `table-fixed` table so columns
 * never move when groups open or close.
 */
export function TableHead({ columns }) {
  return (
    <>
      <colgroup>
        {columns.map((column) => <col key={column.id} className={column.width ?? ''} />)}
      </colgroup>
      <thead>
        <tr className="bg-brand">
          {columns.map((column) => (
            <th key={column.id} scope="col" className={cellClass(column, 'h-10 whitespace-nowrap text-label text-white')}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
