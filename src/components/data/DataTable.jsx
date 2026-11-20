/* eslint-disable react-refresh/only-export-components */
// Column definitions are the one source for the header, the data rows and the group
// rows, so a total always sits in the same column as the values it sums.
//
// column: { id, header, align?: 'left' | 'center' | 'right', width?: Tailwind width class,
//           headerClassName?: extra classes for this column's header }

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

/** Classes for a cell in `column`. Every cell already uses tabular figures (src/index.css). */
export const cellClass = (column, extra = '') => [
  'px-2 first:pl-3 last:pr-3 sm:first:pl-4 sm:last:pr-3',
  ALIGN[column.align ?? 'left'],
  extra,
].filter(Boolean).join(' ');

const HEADER_VARIANTS = {
  // Solid brand fill, white uppercase labels (Ledger, Historical Checks).
  brand: { row: 'bg-brand', cell: 'h-10 text-white' },
  // Light grey fill, grey uppercase labels (Production Log).
  neutral: { row: 'border-b border-ink-200 bg-ink-100', cell: 'h-10 text-ink-600' },
};

/**
 * <colgroup> + <thead>: uppercase column labels in the `variant` style ('brand' by default).
 * Widths come from the column definitions; use it in a `table-fixed` table so columns
 * never move when groups open or close.
 */
export function TableHead({ columns, variant = 'brand' }) {
  const style = HEADER_VARIANTS[variant] ?? HEADER_VARIANTS.brand;
  return (
    <>
      <colgroup>
        {columns.map((column) => <col key={column.id} className={column.width ?? ''} />)}
      </colgroup>
      <thead>
        <tr className={style.row}>
          {columns.map((column) => (
            <th key={column.id} scope="col" className={cellClass(column, `${style.cell} whitespace-nowrap text-label ${column.headerClassName ?? ''}`)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
