import React from 'react';

/**
 * TableScroll — makes wide data tables usable on small screens.
 *
 * Problem: pages render data tables inside a `card-machined overflow-hidden`
 * wrapper, so on narrow viewports the table is clipped (overflow-hidden) with no
 * way to reach off-screen columns. This wrapper provides horizontal scrolling with
 * a stable minimum width so columns keep their layout instead of being crushed.
 *
 * Usage:
 *   <TableScroll>
 *     <table className="w-full ...">...</table>
 *   </TableScroll>
 *
 * On >= `minWidth` screens the table lays out normally (w-full). Below that, the
 * container scrolls horizontally and the table holds its natural column widths.
 */
export default function TableScroll({ children, minWidth = 720, className = '' }) {
  return (
    <div
      className={`-mx-1 overflow-x-auto px-1 md:mx-0 md:px-0 ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div style={{ minWidth }} className="md:min-w-0">
        {children}
      </div>
    </div>
  );
}
