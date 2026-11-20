import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACT, DEMO_BUTTON, FAQ, FOOTER, PHOTOS, PLACEHOLDERS, PLANS, PRICING, SHOWCASE, SITE, TESTIMONIALS } from '../content.js';
import { buildJsonLd } from '../jsonLd.js';
import { landingPage } from '../landingPlugin.js';
import { photoVariants } from '../parts/picture.js';
import { faq } from '../sections/faq.js';
import { pricing } from '../sections/pricing.js';
import { siteFooter } from '../sections/siteFooter.js';
import { testimonials } from '../sections/testimonials.js';

const root = path.resolve(import.meta.dirname, '../../..');
const readRoot = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const transform = (html, filename) => landingPage().transformIndexHtml.handler(html, { filename });
const renderedLanding = () => transform(readRoot('index.html'), path.join(root, 'index.html'));
const graphNode = (type) => buildJsonLd()['@graph'].find((node) => node['@type'] === type);
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const occurrences = (html, text) => html.split(text).length - 1;

afterEach(() => {
  PLANS.forEach((plan) => { delete plan.price; });
});

describe('landing page rendering', () => {
  it('fills every token and marker in index.html', () => {
    const html = renderedLanding();

    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(html).not.toMatch(/<!-- landing:/);
    expect(html).toContain(`<link rel="canonical" href="${SITE.url}/" />`);
    expect(html).toContain(`<meta property="og:image" content="${SITE.ogImage}" />`);
  });

  it('leaves the SPA shell untouched', () => {
    const appHtml = readRoot('app.html');
    expect(transform(appHtml, path.join(root, 'app.html'))).toBe(appHtml);
  });

  it('has one h1, the landmarks and the sections in the approved order', () => {
    const html = renderedLanding();
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(count(html, /<main[\s>]/g)).toBe(1);
    expect(count(html, /<header[\s>]/g)).toBe(1);
    expect(count(html, /<footer[\s>]/g)).toBe(1);

    const order = ['id="top"', 'id="product"', 'problems-title', 'id="features"', 'more-features-title', 'steps-title', 'id="faq"', 'id="stories"', 'id="pricing"', 'cta-title'];
    const positions = order.map((marker) => html.indexOf(marker));
    expect(positions.every((position) => position > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('escapes HTML in content', () => {
    const html = faq({ title: 'FAQ', items: [{ q: 'Is <b>this</b> safe?', a: 'Yes & "quoted"' }] });
    expect(html).toContain('Is &lt;b&gt;this&lt;/b&gt; safe?');
    expect(html).toContain('Yes &amp; &quot;quoted&quot;');
  });
});

describe('photos', () => {
  it('preloads only the header logo and the hero photo, and lazy-loads every other image', () => {
    const html = renderedLanding();
    expect(count(html, /rel="preload" as="image"/g)).toBe(2);
    expect(html).toContain(`/images/landing/${PHOTOS.hero.name}-`);

    const images = html.match(/<img [^>]+>/g);
    const eager = images.filter((img) => !img.includes('loading="lazy"'));
    expect(eager).toHaveLength(2);
    expect(eager[0]).toContain('src="/brand/logo-horizontal.svg"');
    expect(eager[1]).toContain('fetchpriority="high"');
    expect(eager[1]).toContain(PHOTOS.hero.name);
  });

  it('gives every photo alt text, every logo the product name or none, and every image dimensions', () => {
    renderedLanding().match(/<img [^>]+>/g).forEach((img) => {
      // A logo inside a labelled link or a labelled drawing has an empty alt; otherwise the name.
      expect(img).toMatch(img.includes('src="/brand/') ? /alt="(Maziwa Smart)?"/ : /alt="[^"]{10,}"/);
      expect(img).toMatch(/width="\d+" height="\d+"/);
    });
  });

  it('offers AVIF and WebP sources for each photo, and every variant exists on disk', () => {
    const html = renderedLanding();
    expect(count(html, /<source type="image\/avif"/g)).toBe(Object.keys(PHOTOS).length);
    expect(count(html, /<source type="image\/webp"/g)).toBe(Object.keys(PHOTOS).length);

    Object.values(PHOTOS).flatMap(photoVariants).forEach(({ url }) => {
      expect(fs.existsSync(path.join(root, 'public', url)), `${url} missing: run npm run images`).toBe(true);
    });
  });

  it('lazy-loads every showcase screenshot', () => {
    const html = renderedLanding();
    SHOWCASE.tabs.flatMap((tab) => tab.screens).forEach((screen) => {
      expect(html).toMatch(new RegExp(`<img src="${screen.src}"[^>]+loading="lazy"`));
    });
  });
});

describe('dashboard preview', () => {
  it('is one labelled image whose mock is hidden from screen readers and marked as sample data', () => {
    const html = renderedLanding();
    const section = html.slice(html.indexOf('id="product"'), html.indexOf('problems-title'));
    expect(count(section, /role="img"/g)).toBe(1);
    expect(section).toMatch(/role="img" aria-label="[^"]*sample data"/);
    expect(section).toContain('aria-hidden="true" class="landing-tilt');
    expect(section).toContain('Sample data');
  });
});

describe('farmer stories', () => {
  it('renders one card per testimonial', () => {
    const html = testimonials({ copy: TESTIMONIALS, photo: PHOTOS.testimonials });
    expect(count(html, /<figure/g)).toBe(TESTIMONIALS.items.length);
    TESTIMONIALS.items.forEach(({ name }) => expect(html).toContain(name));
  });

  it('adds a card when an entry is added to content', () => {
    const copy = { ...TESTIMONIALS, items: [...TESTIMONIALS.items, { quote: 'Real quote', name: 'Wanjiru Farm', location: 'Nyeri County', herd: '8 cows' }] };
    const html = testimonials({ copy, photo: PHOTOS.testimonials });
    expect(count(html, /<figure/g)).toBe(TESTIMONIALS.items.length + 1);
    expect(html).toContain('Real quote');
  });
});

describe('pricing', () => {
  it('shows "Price coming soon" and no amount while plans have no price', () => {
    const html = pricing({ copy: PRICING, plans: PLANS });
    expect(count(html, /<article/g)).toBe(PLANS.length);
    expect(count(html, new RegExp(PRICING.comingSoon, 'g'))).toBe(PLANS.length);
    expect(html).not.toContain('KSh');
  });

  it('shows a KSh amount once a plan has a price', () => {
    PLANS[1].price = 1500;
    const html = pricing({ copy: PRICING, plans: PLANS });
    expect(html).toContain('KSh 1,500');
    expect(count(html, new RegExp(PRICING.comingSoon, 'g'))).toBe(PLANS.length - 1);
  });
});

describe('contact details and actions', () => {
  it('builds every phone, WhatsApp and email link from SITE', () => {
    const html = renderedLanding();
    expect(occurrences(html, 'href="tel:')).toBe(occurrences(html, `href="${CONTACT.phone.href}"`));
    expect(occurrences(html, 'href="https://wa.me/')).toBe(occurrences(html, `href="${CONTACT.whatsapp.href}"`));
    expect(occurrences(html, `href="${CONTACT.whatsapp.href}"`)).toBe(4); // top bar, pricing, closing CTA, footer
    expect(count(html, /href="mailto:/g)).toBe(1);
    expect(html).toContain(`href="mailto:${SITE.email}"`);
  });

  it('renders every live demo control as the shared action button', () => {
    const html = renderedLanding();
    const buttons = html.match(new RegExp(`<button type="button" data-action="${DEMO_BUTTON.action}"[^>]*>[\\s\\S]*?</button>`, 'g'));
    expect(buttons).toHaveLength(2); // hero and footer
    buttons.forEach((button) => expect(button).toContain(DEMO_BUTTON.label));
  });

  it('hides legal links until they have a page', () => {
    expect(siteFooter({ name: SITE.name, year: 2026, footer: FOOTER })).not.toContain('Privacy');
    const withPrivacy = { ...FOOTER, legal: [{ label: 'Privacy', href: '/privacy' }] };
    expect(siteFooter({ name: SITE.name, year: 2026, footer: withPrivacy })).toContain('href="/privacy"');
  });
});

describe('schema.org JSON-LD', () => {
  it('emits Organization, WebSite, SoftwareApplication and FAQPage nodes', () => {
    const types = buildJsonLd()['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']);
  });

  it('mirrors the visible FAQ exactly', () => {
    const questions = graphNode('FAQPage').mainEntity;
    expect(questions.map((item) => [item.name, item.acceptedAnswer.text])).toEqual(FAQ.items.map(({ q, a }) => [q, a]));
  });

  it('claims no ratings or reviews', () => {
    const json = JSON.stringify(buildJsonLd());
    expect(json).not.toMatch(/aggregateRating|"review"/i);
  });

  it('omits offers until plans have prices', () => {
    expect(graphNode('SoftwareApplication')).not.toHaveProperty('offers');
  });

  it('lists only priced plans as KES offers', () => {
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

describe('landing page brand logo', () => {
  it('shows the supplied horizontal logo in the header, linking home, and no hand-drawn mark', () => {
    const html = renderedLanding();
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));

    expect(header).toMatch(/<a href="\/" aria-label="Maziwa Smart home"[^>]*>\s*<img src="\/brand\/logo-horizontal\.svg" width="117" height="40" alt=""/);
    // The old calf mark was an inline SVG on a brand tile.
    expect(header).not.toContain('<svg');
  });

  it('shows the white logo in the footer and no faint name watermark', () => {
    const html = siteFooter({ name: SITE.name, year: 2026, footer: FOOTER });

    expect(html).toContain('<img src="/brand/logo-horizontal-white.svg" width="136" height="48" alt="Maziwa Smart"');
    expect(html).not.toContain('text-white/[0.06]');
  });

  it('shows the white logo in the app drawing’s sidebar instead of a typed name', () => {
    const html = renderedLanding();

    expect(occurrences(html, 'src="/brand/logo-horizontal-white.svg"')).toBe(2);
    expect(html).not.toContain('Smart Dairy');
  });

  it('preloads the header logo and points the organisation logo at the brand icon', () => {
    const html = renderedLanding();

    expect(html).toContain('<link rel="preload" as="image" type="image/svg+xml" href="/brand/logo-horizontal.svg" />');
    expect(graphNode('Organization').logo).toBe(`${SITE.url}/brand/icon-512.png`);
  });
});
