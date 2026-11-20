// Which brand file each logo variant uses, and at what size. The artwork lives in public/brand/
// exactly as supplied by the brand owner; nothing here draws, recolours or crops it.

export const BRAND_DIR = '/brand';

export const BRAND_VARIANTS = ['horizontal', 'stacked', 'stacked-endorsed', 'wordmark', 'mascot'];

// Each file with its width ÷ height (from the SVG viewBox or PNG size), so the <img> reserves its
// space before the file loads. Regenerated artwork keeps its file names; update a ratio here only
// if a file's proportions change.
// tone `light`: for light backgrounds. `dark`: the white wordmark, or the mascot on its white tile,
// for brand-blue or dark backgrounds. `ink`: the wordmark in ink, for thermal prints only.
const FILES = {
  horizontal: {
    light: ['logo-horizontal.svg', 1165 / 400],
    dark: ['logo-horizontal-white.svg', 1137 / 400],
  },
  stacked: {
    light: ['logo-stacked.svg', 817 / 1012],
    dark: ['logo-stacked-white.svg', 817 / 1045],
  },
  'stacked-endorsed': {
    light: ['logo-stacked-endorsed.svg', 817 / 1115],
    dark: ['logo-stacked-endorsed-white.svg', 817 / 1148],
  },
  wordmark: {
    light: ['wordmark-blue.svg', 936 / 432],
    dark: ['wordmark-white.svg', 936 / 432],
    ink: ['wordmark-ink.svg', 936 / 432],
  },
  mascot: {
    light: ['mascot.png', 512 / 484],
    dark: ['mascot-on-tile.png', 1],
  },
};

// `size` is the height for these two and the width for the others.
const SIZED_BY_HEIGHT = new Set(['horizontal', 'mascot']);

/** The smallest each variant may be shown, in px (height or width, as `size`). */
export const MIN_SIZE = {
  horizontal: 32,
  stacked: 120,
  'stacked-endorsed': 160,
  wordmark: 80,
  mascot: 16,
};

/**
 * The file and box for one logo.
 *
 * @param {object} options
 * @param {'horizontal'|'stacked'|'stacked-endorsed'|'wordmark'|'mascot'} options.variant
 * @param {'light'|'dark'|'ink'} [options.tone] `ink` exists for the wordmark only; elsewhere it is `light`.
 * @param {number} [options.size] px; raised to the variant's minimum.
 * @returns {{ src: string, srcSet?: string, width: number, height: number }}
 */
export function brandLogoImage({ variant, tone = 'light', size }) {
  const name = FILES[variant] ? variant : 'horizontal';
  const files = FILES[name];
  const [file, ratio] = files[tone] ?? files.light;
  const clamped = Math.max(Number(size) || 0, MIN_SIZE[name]);
  const [width, height] = SIZED_BY_HEIGHT.has(name) ? [clamped * ratio, clamped] : [clamped, clamped / ratio];
  const src = `${BRAND_DIR}/${file}`;
  // Only the plain mascot PNG comes in 2x and 3x.
  const srcSet = file === FILES.mascot.light[0]
    ? `${src} 1x, ${BRAND_DIR}/mascot@2x.png 2x, ${BRAND_DIR}/mascot@3x.png 3x`
    : undefined;
  return { src, srcSet, width: Math.round(width), height: Math.round(height) };
}
