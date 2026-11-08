import { SURFACE } from './surface';

/**
 * One container for a page's records: optional tabs, the toolbar, notices, then the
 * table or cards. Slots only; the page decides what goes in each.
 * overflow: clip (not hidden) keeps the corners without stopping sticky headers.
 */
export default function DataSection({ label, tabs, toolbar, notices, children }) {
  return (
    <section aria-label={label} className={`${SURFACE} overflow-clip`}>
      {tabs && <div className="border-b border-ink/10 px-3 sm:px-4">{tabs}</div>}
      {toolbar && <div className="border-b border-ink/10 px-3 py-2 sm:px-4">{toolbar}</div>}
      {notices}
      {children}
    </section>
  );
}
