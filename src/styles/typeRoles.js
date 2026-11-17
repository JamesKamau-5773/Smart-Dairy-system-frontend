// The type roles, by name. Their values (size, line height, weight, letter spacing) are
// tokens in src/styles/brand.css (--type-<role>-*). Each role is a `text-<role>` class,
// built in tailwind.config.js; tailwind-merge (src/lib/utils.js) and the typography lint
// rule (eslint-rules/) read the same list.
//
//   page-title     24/32 600   the page's one <h1>
//   section-title  16/24 600   <h2> (nested headings share it)
//   body           14/20 400
//   body-strong    14/20 600
//   label          12/16 500   uppercase, 0.04em: table headers and small section headings only
//   meta           13/18 400   timestamps, counts, helper text, chart text
//   field-label    13/18 600   a form field's name, above its input (sentence case)
//   stat-value     20/28 600   tabular figures
//   control        14/20 500   buttons and inputs (16px inputs at <=640px, see brand.css)
//   badge          13/18 500
//   numeric-input  28/36 600   tabular; litres entry only (stays 28px on phones)
export const TYPE_ROLES = [
  'page-title',
  'section-title',
  'body',
  'body-strong',
  'label',
  'meta',
  'field-label',
  'stat-value',
  'control',
  'badge',
  'numeric-input',
];
