// The app's visual tones, from its own palette: brand blue and ink only.
// Severity is carried by the strength of the blue plus an icon and words, never
// by amber or red fills (the house style; see Confirmation, which maps even
// "danger" onto brand-dark). Red is kept only for inline form-field error text.

export const TONES = Object.freeze({
  neutral: {
    surface: 'bg-ink-50',
    border: 'border-ink/10',
    icon: 'text-ink-muted',
    chip: 'bg-ink-100 text-ink-muted',
    dot: 'bg-ink-400',
    bar: 'bg-ink-400',
  },
  info: {
    surface: 'bg-brand-50',
    border: 'border-brand/20',
    icon: 'text-brand',
    chip: 'bg-brand-50 text-brand-dark',
    dot: 'bg-brand-400',
    bar: 'bg-brand',
  },
  // Needs a look soon (was amber).
  attention: {
    surface: 'bg-brand-50',
    border: 'border-brand/40',
    icon: 'text-brand-dark',
    chip: 'bg-brand-100 text-brand-900',
    dot: 'bg-brand',
    bar: 'bg-brand-dark',
  },
  // Act now (was red).
  critical: {
    surface: 'bg-brand-100',
    border: 'border-brand-dark/60',
    icon: 'text-brand-dark',
    chip: 'bg-brand-dark text-white',
    dot: 'bg-brand-dark',
    bar: 'bg-brand-dark',
  },
});

// Errors that need action: the one inverted block on a white page. Dark brand
// blue with white text (about 9:1 contrast) stands out without leaving the palette.
export const INVERSE = Object.freeze({
  panel: 'border-brand-dark bg-brand-dark text-white',
  chip: 'bg-white/15',
  icon: 'text-white',
  title: 'text-white',
  message: 'text-brand-100',
  link: 'text-white hover:text-brand-100',
  control: 'text-brand-100 hover:bg-white/10 hover:text-white',
});

export const tone = (name) => TONES[name] ?? TONES.neutral;
