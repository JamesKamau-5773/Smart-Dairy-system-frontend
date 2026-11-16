// Group rows in the brand table style: a tinted year row, a lighter tinted month row and a
// white day row, with brand-coloured year and month labels. Levels also differ by weight and
// indent, so they never rest on colour alone. The month header is sticky, so its fill is solid.
export const LEVEL_STYLES = {
  year: 'bg-brand-100 text-brand-dark text-sm font-bold',
  month: 'bg-brand-50 text-brand text-sm font-semibold',
  day: 'bg-card text-ink text-xs font-semibold',
};

export const LEVEL_INDENT = {
  year: 'pl-2 sm:pl-4',
  month: 'pl-2 sm:pl-5',
  day: 'pl-4 sm:pl-8',
};
