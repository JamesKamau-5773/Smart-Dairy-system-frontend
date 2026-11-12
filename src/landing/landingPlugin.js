import path from 'path';
import { PHOTOS, PLACEHOLDERS, SEO, SITE } from './content.js';
import { escapeHtml } from './html.js';
import { jsonLdScript } from './jsonLd.js';
import { preloadPhoto } from './parts/picture.js';
import { renderPage } from './renderPage.js';

// {{TOKEN}}s in index.html's <head>, all from content.js. Values are HTML-escaped.
const TOKENS = {
  '{{TITLE}}': SEO.title,
  '{{DESCRIPTION}}': SEO.description,
  '{{OG_DESCRIPTION}}': SEO.ogDescription,
  '{{OG_IMAGE_ALT}}': SEO.ogImageAlt,
  '{{SITE_URL}}': SITE.url,
  '{{SITE_NAME}}': SITE.name,
  '{{OG_IMAGE}}': SITE.ogImage,
};

// <!-- landing:... --> markers in index.html, replaced with rendered HTML.
const MARKERS = {
  '<!-- landing:preload -->': () => preloadPhoto(PHOTOS.hero),
  '<!-- landing:jsonld -->': jsonLdScript,
  '<!-- landing:page -->': () => renderPage(),
};

/** Fills index.html from content.js. Exported for tests. */
export const renderLanding = (html) => {
  let output = html;
  for (const [marker, render] of Object.entries(MARKERS)) output = output.replace(marker, render());
  for (const [token, value] of Object.entries(TOKENS)) output = output.replaceAll(token, escapeHtml(value));
  return output;
};

/**
 * Renders the landing page (index.html) at build time and in dev.
 * The SPA shell (app.html) is left untouched.
 */
export function landingPage() {
  return {
    name: 'maziwa-landing-page',
    buildStart() {
      if (PLACEHOLDERS.length > 0) {
        this.warn(`Landing page still uses placeholder values: ${PLACEHOLDERS.join(', ')}. Update src/landing/content.js.`);
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (path.basename(ctx.filename) !== 'index.html') return html;
        return renderLanding(html);
      },
    },
  };
}
