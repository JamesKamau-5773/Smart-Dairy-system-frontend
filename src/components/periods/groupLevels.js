// Group rows in the brand table style: a tinted year row, a lighter tinted month row and a
// white day row, with brand-coloured year and month labels. Levels also differ by weight and
// indent, so they never rest on colour alone. The month header is sticky, so its fill is solid.
// The type role is set again on the row's toggle button (LEVEL_TYPE), because buttons carry
// the control role of their own and would not inherit it.
export const LEVEL_TYPE = {
  year: 'text-body-strong',
  month: 'text-body-strong',
  day: 'text-body',
};

export const LEVEL_STYLES = {
  year: `bg-brand-100 text-brand-dark ${LEVEL_TYPE.year}`,
  month: `bg-brand-50 text-brand ${LEVEL_TYPE.month}`,
  day: `bg-card text-ink ${LEVEL_TYPE.day}`,
};

export const LEVEL_INDENT = {
  year: 'pl-2 sm:pl-4',
  month: 'pl-2 sm:pl-5',
  day: 'pl-4 sm:pl-8',
};
