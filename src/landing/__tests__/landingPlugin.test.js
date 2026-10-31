import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAQS, PLACEHOLDERS, PLANS, SHOWCASE, SITE, TESTIMONIALS } from '../content.js';
import { buildJsonLd, landingPage, renderFaq, renderPricing, renderShowcase, renderTestimonials } from '../landingPlugin.js';

const root = path.resolve(import.meta.dirname, '../../..');
const readRoot = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const transform = (html, filename) => landingPage().transformIndexHtml.handler(html, { filename });
const renderedLanding = () => transform(readRoot('index.html'), path.join(root, 'index.html'));
const graphNode = (type) => buildJsonLd()['@graph'].find((node) => node['@type'] === type);

const originalPrices = PLANS.map((plan) => plan.price);
afterEach(() => {
  PLANS.forEach((plan, index) => { plan.price = originalPrices[index]; });
});

describe('landing page rendering', () => {
  it('fills every template token and section marker in index.html', () => {
    const html = renderedLanding();

    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(html).not.toMatch(/\{\{icon:/);
    expect(html).not.toMatch(/<!-- landing:(showcase|testimonials|pricing|faq|jsonld) -->/);
    expect(html).toContain(`<link rel="canonical" href="${SITE.url}/" />`);
    expect(html).toContain(`<meta property="og:image" content="${SITE.ogImage}" />`);
  });

  it('leaves the SPA shell untouched', () => {
    const appHtml = readRoot('app.html');
    expect(transform(appHtml, path.join(root, 'app.html'))).toBe(appHtml);
  });

  it('renders one FAQ item and one pricing card per content entry', () => {
    expect(renderFaq().match(/<details/g)).toHaveLength(FAQS.length);
    expect(renderPricing().match(/<article/g)).toHaveLength(PLANS.length);
  });

  it('shows a KSh placeholder for unpriced plans and KSh amounts for priced ones', () => {
    PLANS[0].price = null;
    PLANS[1].price = 1500;

    const html = renderPricing();
    expect(html).toContain('KSh _');
    expect(html).toContain('Price to be announced');
    expect(html).toContain('KSh 1,500');
  });

  it('renders one accessible tab and panel per showcase entry, with the first selected', () => {
    const html = renderShowcase();
    expect(html.match(/role="tab"/g)).toHaveLength(SHOWCASE.length);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(SHOWCASE.length);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/data-showcase-panel data-active/g)).toHaveLength(1);
    SHOWCASE.forEach(({ id }) => {
      expect(html).toContain(`aria-controls="showcase-panel-${id}"`);
      expect(html).toContain(`aria-labelledby="showcase-tab-${id}"`);
    });
  });

  it('lazy-loads every showcase screenshot with alt text and dimensions', () => {
    const images = renderShowcase().match(/<img [^>]+>/g);
    expect(images).toHaveLength(SHOWCASE.flatMap((item) => item.screens).length);
    images.forEach((img) => {
      expect(img).toMatch(/alt="[^"]{10,}"/);
      expect(img).toMatch(/width="\d+" height="\d+"/);
      expect(img).toContain('loading="lazy"');
    });
  });

  it('does not lazy-load the hero image', () => {
    const hero = renderedLanding().match(/<img [^>]*fetchpriority="high"[^>]*>/);
    expect(hero).not.toBeNull();
    expect(hero[0]).not.toContain('loading="lazy"');
  });

  it('shows marked placeholders until real farmer quotes exist', () => {
    expect(TESTIMONIALS).toHaveLength(0);
    expect(renderTestimonials()).toContain('Placeholder');

    TESTIMONIALS.push({ quote: 'Real quote', name: 'Wanjiru', location: 'Nyeri', herd: '8 cows' });
    try {
      const html = renderTestimonials();
      expect(html).not.toContain('Placeholder');
      expect(html).toContain('Real quote');
    } finally {
      TESTIMONIALS.pop();
    }
  });

  it('escapes HTML in content', () => {
    FAQS.push({ q: 'Is <b>this</b> safe?', a: 'Yes & "quoted"' });
    try {
      const html = renderFaq();
      expect(html).toContain('Is &lt;b&gt;this&lt;/b&gt; safe?');
      expect(html).toContain('Yes &amp; &quot;quoted&quot;');
    } finally {
      FAQS.pop();
    }
  });
});

describe('schema.org JSON-LD', () => {
  it('emits Organization, WebSite, SoftwareApplication and FAQPage nodes', () => {
    const types = buildJsonLd()['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']);
  });

  it('mirrors the visible FAQ exactly', () => {
    const questions = graphNode('FAQPage').mainEntity;
    expect(questions.map((item) => [item.name, item.acceptedAnswer.text])).toEqual(FAQS.map(({ q, a }) => [q, a]));
  });

  it('omits offers until plans have prices', () => {
    PLANS.forEach((plan) => { plan.price = null; });
    expect(graphNode('SoftwareApplication')).not.toHaveProperty('offers');
  });

  it('lists only priced plans as KES offers', () => {
    PLANS.forEach((plan) => { plan.price = null; });
    PLANS[1].price = 1500;

    expect(graphNode('SoftwareApplication').offers).toEqual([
      expect.objectContaining({ '@type': 'Offer', name: PLANS[1].name, price: 1500, priceCurrency: 'KES' }),
    ]);
  });

  it('is valid JSON inside the rendered page and cannot close its script tag', () => {
    const match = renderedLanding().match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(match[1]).not.toContain('</');
    expect(JSON.parse(match[1])['@graph']).toHaveLength(4);
  });
});

describe('placeholder warning', () => {
  it('warns at build start while placeholders remain', () => {
    const warn = vi.fn();
    landingPage().buildStart.call({ warn });

    if (PLACEHOLDERS.length > 0) {
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('placeholder'));
    } else {
      expect(warn).not.toHaveBeenCalled();
    }
  });
});

describe('crawler files', () => {
  it('points robots.txt at the sitemap on the canonical host', () => {
    expect(readRoot('public/robots.txt')).toContain(`Sitemap: ${SITE.url}/sitemap.xml`);
  });

  it('keeps the landing page crawlable and app areas blocked', () => {
    const disallowed = readRoot('public/robots.txt')
      .split('\n')
      .filter((line) => line.startsWith('Disallow:'))
      .map((line) => line.replace('Disallow:', '').trim());

    expect(disallowed).not.toContain('/');
    expect(disallowed).toEqual(expect.arrayContaining(['/app', '/dashboard', '/operations/', '/finance/', '/hr/']));
  });

  it('lists the canonical landing URL in the sitemap', () => {
    expect(readRoot('public/sitemap.xml')).toContain(`<loc>${SITE.url}/</loc>`);
  });

  it('marks the SPA shell noindex', () => {
    expect(readRoot('app.html')).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});
