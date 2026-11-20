import { cx, escapeHtml } from '../html.js';

/**
 * Responsive photos. `npm run images` (scripts/landing-images.mjs) writes every
 * variant listed by photoVariants() from public/images/<name>.jpg.
 */

export const FORMATS = ['avif', 'webp', 'jpg'];

const variantUrl = (photo, width, format) => `/images/landing/${photo.name}-${width}.${format}`;
const srcset = (photo, format) => photo.widths.map((width) => `${variantUrl(photo, width, format)} ${width}w`).join(', ');

/** Every file the page expects for a photo: [{ width, format, url }]. */
export const photoVariants = (photo) => photo.widths.flatMap((width) => FORMATS.map((format) => ({ width, format, url: variantUrl(photo, width, format) })));

/**
 * <picture> with AVIF and WebP sources and a JPEG fallback.
 * `eager` is for the one above-the-fold photo; every other photo lazy-loads.
 */
export const picture = (photo, { sizes = '100vw', eager = false, className } = {}) => {
  const largest = photo.widths[photo.widths.length - 1];
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture>
    <source type="image/avif" srcset="${srcset(photo, 'avif')}" sizes="${sizes}" />
    <source type="image/webp" srcset="${srcset(photo, 'webp')}" sizes="${sizes}" />
    <img src="${variantUrl(photo, largest, 'jpg')}" srcset="${srcset(photo, 'jpg')}" sizes="${sizes}" alt="${escapeHtml(photo.alt)}" width="${photo.width}" height="${photo.height}" ${loading} decoding="async" class="${cx(className)}" style="object-position: ${escapeHtml(photo.position)}" />
  </picture>`;
};

/** <link rel="preload"> for the hero photo, in the format modern browsers pick. */
export const preloadPhoto = (photo, { sizes = '100vw' } = {}) => `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(photo, 'avif')}" imagesizes="${sizes}" fetchpriority="high" />`;
