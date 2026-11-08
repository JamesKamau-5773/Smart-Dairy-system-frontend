// Levels are told apart by weight, indent and a neutral fill that lightens by level,
// never by brand colour or a coloured edge. The month header is sticky, so its fill is solid.
export const LEVEL_STYLES = {
  year: 'bg-ink-100 text-ink text-sm font-bold',
  month: 'bg-ink-50 text-ink text-sm font-semibold',
  week: 'bg-ink-50 text-ink text-xs font-semibold',
  day: 'bg-card text-ink text-xs font-semibold',
};

export const LEVEL_INDENT = {
  year: 'pl-2 sm:pl-4',
  month: 'pl-2 sm:pl-5',
  week: 'pl-3 sm:pl-8',
  day: 'pl-4 sm:pl-11',
};
