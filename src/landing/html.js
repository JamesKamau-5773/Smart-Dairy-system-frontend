// Small helpers shared by the landing page's render functions.

/** Escapes text for use in HTML content and double-quoted attributes. */
export const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Joins class names, skipping empty ones. */
export const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Renders each item and joins the results. */
export const each = (items, render) => items.map(render).join('');

/** `rel` for links that leave the site. */
export const externalRel = (href) => (/^https?:\/\//.test(href) ? ' rel="noopener"' : '');
