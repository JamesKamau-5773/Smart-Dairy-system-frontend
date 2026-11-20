import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BrandLogo from '../BrandLogo';
import { MIN_SIZE, brandLogoImage } from '../brandLogo';

afterEach(cleanup);

const img = (props) => render(<BrandLogo {...props} />).container.querySelector('img');

describe('brandLogoImage: file per variant and tone', () => {
  it.each([
    ['horizontal', 'light', '/brand/logo-horizontal.svg'],
    ['horizontal', 'dark', '/brand/logo-horizontal-white.svg'],
    ['stacked', 'light', '/brand/logo-stacked.svg'],
    ['stacked', 'dark', '/brand/logo-stacked-white.svg'],
    ['stacked-endorsed', 'light', '/brand/logo-stacked-endorsed.svg'],
    ['stacked-endorsed', 'dark', '/brand/logo-stacked-endorsed-white.svg'],
    ['wordmark', 'light', '/brand/wordmark-blue.svg'],
    ['wordmark', 'dark', '/brand/wordmark-white.svg'],
    ['wordmark', 'ink', '/brand/wordmark-ink.svg'],
    ['mascot', 'light', '/brand/mascot.png'],
    ['mascot', 'dark', '/brand/mascot-on-tile.png'],
  ])('%s / %s → %s', (variant, tone, src) => {
    expect(brandLogoImage({ variant, tone, size: 200 }).src).toBe(src);
  });

  it('uses the light file where a variant has no such tone (ink is for the wordmark only)', () => {
    expect(brandLogoImage({ variant: 'horizontal', tone: 'ink' }).src).toBe('/brand/logo-horizontal.svg');
  });

  it('gives the plain mascot PNG its 1x/2x/3x set, and nothing else', () => {
    expect(brandLogoImage({ variant: 'mascot', size: 32 }).srcSet)
      .toBe('/brand/mascot.png 1x, /brand/mascot@2x.png 2x, /brand/mascot@3x.png 3x');
    expect(brandLogoImage({ variant: 'mascot', tone: 'dark', size: 32 }).srcSet).toBeUndefined();
    expect(brandLogoImage({ variant: 'horizontal', size: 34 }).srcSet).toBeUndefined();
  });
});

describe('brandLogoImage: minimum sizes', () => {
  it('raises a too-small size to the minimum: height for horizontal and mascot', () => {
    expect(brandLogoImage({ variant: 'horizontal', size: 20 }).height).toBe(32);
    expect(brandLogoImage({ variant: 'mascot', size: 8 }).height).toBe(16);
  });

  it('raises a too-small size to the minimum: width for stacked, endorsed and wordmark', () => {
    expect(brandLogoImage({ variant: 'stacked', size: 100 }).width).toBe(120);
    expect(brandLogoImage({ variant: 'stacked-endorsed', size: 100 }).width).toBe(160);
    expect(brandLogoImage({ variant: 'wordmark', size: 40 }).width).toBe(80);
  });

  it('keeps sizes at or above the minimum, and uses the minimum when none is given', () => {
    expect(brandLogoImage({ variant: 'horizontal', size: 34 }).height).toBe(34);
    expect(brandLogoImage({ variant: 'stacked-endorsed', size: 220 }).width).toBe(220);
    expect(brandLogoImage({ variant: 'stacked-endorsed', size: 220 }).height).toBe(300);
    for (const [variant, min] of Object.entries(MIN_SIZE)) {
      const { width, height } = brandLogoImage({ variant });
      expect(['horizontal', 'mascot'].includes(variant) ? height : width).toBe(min);
    }
  });
});

describe('BrandLogo', () => {
  it('names the product in its alt text', () => {
    expect(img({ variant: 'horizontal' }).getAttribute('alt')).toBe('Maziwa Smart');
    expect(img({ variant: 'mascot' }).getAttribute('alt')).toBe('Maziwa Smart');
  });

  it('names the endorsement for the endorsed lock-up', () => {
    expect(img({ variant: 'stacked-endorsed' }).getAttribute('alt')).toBe('Maziwa Smart, powered by Jivu Systems');
  });

  it('has an empty alt when decorative', () => {
    expect(img({ variant: 'stacked-endorsed', decorative: true }).getAttribute('alt')).toBe('');
  });

  it('fixes its box, cannot be dragged and never distorts the artwork', () => {
    // The box follows the artwork's own proportions (the mascot is 512 × 484).
    const logo = img({ variant: 'mascot', size: 96 });
    expect(logo.getAttribute('width')).toBe('102');
    expect(logo.getAttribute('height')).toBe('96');
    expect(logo.getAttribute('draggable')).toBe('false');
    expect(logo.className).toContain('object-contain');
    expect(logo.getAttribute('srcset')).toContain('mascot@3x.png 3x');
  });
});
