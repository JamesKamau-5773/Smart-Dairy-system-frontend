// The type roles, by name. Their values (size, line height, weight, letter spacing) are
// tokens in src/styles/brand.css (--type-<role>-*). Each role is a `text-<role>` class,
// built in tailwind.config.js; tailwind-merge (src/lib/utils.js) and the typography lint
// rule (eslint-rules/) read the same list.
// After adding or renaming a role, restart `npm run dev`: the running server keeps its loaded
// copy of this file, so an @apply of the new class fails until it restarts.
//
//   page-title             24/32 800  -0.02em   the page's one <h1>
//   section-title          16/24 600            <h2> (nested headings share it)
//   body                   14/20 400
//   body-strong            14/20 600
//   label                  12/16 500   0.04em   uppercase: table headers and small section headings only
//   meta                   13/18 400            timestamps, counts, helper text, chart text
//   field-label            13/18 600            a form field's name, above its input (sentence case)
//   stat-value             20/28 800  -0.02em   tabular figures
//   stat-label             12/16 600   0.02em   uppercase: a stat card's name, above its figure
//   stat-unit              14/20 500            the unit after a stat figure ("Liters")
//   money-value-primary    28/36 800  -0.01em   tabular: the one money figure a page leads with
//   money-value-secondary  20/28 800  -0.01em   tabular: money figures beside it
//   control                14/20 500            buttons and inputs (16px inputs at <=640px, see brand.css)
//   badge                  13/18 500
//   numeric-input          28/36 600            tabular; litres entry only (stays 28px on phones)
export const TYPE_ROLES = [
  'page-title',
  'section-title',
  'body',
  'body-strong',
  'label',
  'meta',
  'field-label',
  'stat-value',
  'stat-label',
  'stat-unit',
  'money-value-primary',
  'money-value-secondary',
  'control',
  'badge',
  'numeric-input',
];

/** Roles set in capitals. */
export const UPPERCASE_ROLES = ['label', 'stat-label'];

/** Roles that use tabular (equal-width) figures, so columns of numbers line up. */
export const TABULAR_ROLES = ['stat-value', 'money-value-primary', 'money-value-secondary', 'numeric-input'];

/**
 * The only roles allowed the 800 weight (--weight-extrabold): the page title and headline
 * figures. Every other role stays at 600 or below; the type-weight-scale lint rule checks
 * brand.css against this list.
 */
export const EXTRABOLD_ROLES = ['page-title', 'stat-value', 'money-value-primary', 'money-value-secondary'];
