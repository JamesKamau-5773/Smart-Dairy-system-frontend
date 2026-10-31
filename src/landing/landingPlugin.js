import path from 'path';
import { FAQS, HERO_IMAGE, PLACEHOLDERS, PLANS, SHOWCASE, SITE, TESTIMONIALS } from './content.js';
import { icon } from './icons.js';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// JSON inside <script> must not be able to close the tag.
const toJsonLd = (data) => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');

const formatKes = (price) => `KSh ${price.toLocaleString('en-KE')}`;

const renderBenefit = (text) => `<li class="flex gap-3">${icon('check', 'mt-0.5 size-5 text-brand')}<span>${escapeHtml(text)}</span></li>`;

const renderScreen = (screen, { offset }) => `
              <figure class="w-1/2 max-w-[15rem] rounded-3xl bg-ink-900 p-2${offset ? ' md:mt-12' : ''}">
                <img src="${screen.src}" alt="${escapeHtml(screen.alt)}" width="${screen.width}" height="${screen.height}" loading="lazy" decoding="async" class="h-auto w-full rounded-modal bg-white" />
              </figure>`;

export const renderShowcase = () => {
  const tabs = SHOWCASE.map((item, index) => `
          <button type="button" role="tab" id="showcase-tab-${item.id}" aria-controls="showcase-panel-${item.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" class="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-[3px] border-transparent px-3 py-2 text-lg font-bold text-ink-600 transition-colors aria-[selected=false]:hover:border-ink-300 aria-[selected=false]:hover:text-ink-900 aria-selected:border-brand aria-selected:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">${icon(item.icon)}${escapeHtml(item.tab)}</button>`).join('');

  const panels = SHOWCASE.map((item, index) => `
        <div id="showcase-panel-${item.id}" role="tabpanel" aria-labelledby="showcase-tab-${item.id}" tabindex="0" data-showcase-panel${index === 0 ? ' data-active' : ''} class="grid items-center gap-10 pt-10 md:grid-cols-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
          <div>
            <h3 class="text-3xl font-bold tracking-tight text-ink-900">${escapeHtml(item.headline)}</h3>
            <ul class="mt-6 space-y-4 text-lg text-ink-700">
              ${item.benefits.map(renderBenefit).join('\n              ')}
            </ul>
            <a href="/register" class="btn-command mt-8 inline-flex w-full text-lg sm:w-auto">Start free</a>
          </div>
          <div class="flex items-start justify-center gap-4">${item.screens.map((screen, screenIndex) => renderScreen(screen, { offset: screenIndex > 0 })).join('')}
          </div>
        </div>`).join('');

  return `
        <div data-showcase-tabs role="tablist" aria-label="What Maziwa Smart does" class="flex overflow-x-auto border-b border-ink-200">${tabs}
        </div>${panels}`;
};

const PLACEHOLDER_STORY_COUNT = 3;

export const renderTestimonials = () => {
  if (TESTIMONIALS.length === 0) {
    return Array.from({ length: PLACEHOLDER_STORY_COUNT }, () => `
          <li class="rounded-card border border-dashed border-ink/20 bg-surface p-6 text-ink-muted">
            <p class="font-mono text-xs font-semibold uppercase tracking-widest">Placeholder</p>
            <p class="mt-3 text-lg">[Farmer quote, used with their permission]</p>
            <p class="mt-4 text-sm">[Name] · [County] · [Herd size]</p>
          </li>`).join('');
  }

  return TESTIMONIALS.map(({ quote, name, location, herd }) => `
          <li class="card-machined p-6">
            <figure>
              ${icon('quote', 'size-6 text-brand')}
              <blockquote class="mt-3 text-lg text-ink-700">${escapeHtml(quote)}</blockquote>
              <figcaption class="mt-4 text-sm text-ink-muted"><span class="font-semibold text-ink-900">${escapeHtml(name)}</span> · ${escapeHtml(location)} · ${escapeHtml(herd)}</figcaption>
            </figure>
          </li>`).join('');
};

const renderPrice = (plan) => (plan.price == null
  ? '<span aria-hidden="true" class="text-ink-muted">KSh _</span><span class="sr-only">Price to be announced</span>'
  : `${formatKes(plan.price)}<span class="font-sans text-base font-medium text-ink-500"> / ${escapeHtml(plan.period)}</span>`);

export const renderPricing = () => PLANS.map((plan) => `
        <article class="card-machined flex flex-col p-6${plan.highlighted ? ' border-brand' : ''}">
          <h3 class="text-xl font-bold text-ink-900">${escapeHtml(plan.name)}</h3>
          <p class="mt-1 text-sm text-ink-600">${escapeHtml(plan.audience)}</p>
          <p class="mt-4 font-mono text-3xl font-bold text-ink-900">${renderPrice(plan)}</p>
          <ul class="mt-6 flex-1 space-y-3 text-lg text-ink-700">
            ${plan.features.map(renderBenefit).join('\n            ')}
          </ul>
          <a href="${plan.cta === 'Talk to us' ? '#contact' : '/register'}" class="${plan.highlighted ? 'btn-command' : 'btn-secondary'} mt-8 text-lg">${escapeHtml(plan.cta)}</a>
        </article>`).join('');

export const renderFaq = () => FAQS.map(({ q, a }) => `
        <details class="group rounded-card border border-ink-200 bg-white">
          <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-card p-5 text-lg font-semibold text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">${escapeHtml(q)}${icon('plus', 'size-5 text-ink-400 transition-transform group-open:rotate-45')}</summary>
          <p class="px-5 pb-5 text-lg text-ink-700">${escapeHtml(a)}</p>
        </details>`).join('');

export const buildJsonLd = () => {
  const organizationId = `${SITE.url}/#organization`;
  const pricedPlans = PLANS.filter((plan) => plan.price != null);

  const softwareApplication = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE.url}/#software`,
    name: SITE.name,
    url: `${SITE.url}/`,
    image: SITE.ogImage,
    description: 'Dairy farm management software for Kenyan farmers: milk records, herd and breeding, feed, buyers, finances and staff, with offline support.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Dairy farm management',
    operatingSystem: 'Web, Android',
    inLanguage: 'en-KE',
    areaServed: { '@type': 'Country', name: 'Kenya' },
    publisher: { '@id': organizationId },
  };
  if (pricedPlans.length > 0) {
    softwareApplication.offers = pricedPlans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.price,
      priceCurrency: 'KES',
      url: `${SITE.url}/#pricing`,
    }));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: SITE.name,
        legalName: SITE.legalName,
        url: `${SITE.url}/`,
        logo: SITE.logo,
        email: SITE.email,
        telephone: SITE.phone,
        address: {
          '@type': 'PostalAddress',
          addressLocality: SITE.address.locality,
          addressRegion: SITE.address.region,
          addressCountry: SITE.address.country,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: SITE.phone,
          email: SITE.email,
          areaServed: 'KE',
          availableLanguage: ['English', 'Swahili'],
        },
        ...(SITE.sameAs.length > 0 && { sameAs: SITE.sameAs }),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: `${SITE.url}/`,
        name: SITE.name,
        inLanguage: 'en-KE',
        publisher: { '@id': organizationId },
      },
      softwareApplication,
      {
        '@type': 'FAQPage',
        '@id': `${SITE.url}/#faq`,
        mainEntity: FAQS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };
};

const TOKENS = {
  '{{SITE_URL}}': SITE.url,
  '{{SITE_NAME}}': SITE.name,
  '{{OG_IMAGE}}': SITE.ogImage,
  '{{PHONE}}': SITE.phoneDisplay,
  '{{PHONE_HREF}}': `tel:${SITE.phone.replace(/\s+/g, '')}`,
  '{{WHATSAPP_HREF}}': `https://wa.me/${SITE.whatsapp}`,
  '{{EMAIL}}': SITE.email,
  '{{LOCATION}}': `${SITE.address.locality}, Kenya`,
  '{{YEAR}}': String(new Date().getFullYear()),
  '{{HERO_SRC}}': HERO_IMAGE.src,
  '{{HERO_ALT}}': HERO_IMAGE.alt,
  '{{HERO_WIDTH}}': String(HERO_IMAGE.width),
  '{{HERO_HEIGHT}}': String(HERO_IMAGE.height),
};

// {{icon:name}} or {{icon:name tailwind classes}}; the space lets Tailwind's scanner see the classes.
const ICON_TOKEN = /\{\{icon:([a-z-]+)(?: ([^}]+))?\}\}/g;

/**
 * Fills the landing page (index.html) with the rendered showcase, farmer
 * stories, pricing, FAQ, icons and JSON-LD.
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

        let output = html
          .replace('<!-- landing:showcase -->', renderShowcase())
          .replace('<!-- landing:testimonials -->', renderTestimonials())
          .replace('<!-- landing:pricing -->', renderPricing())
          .replace('<!-- landing:faq -->', renderFaq())
          .replace('<!-- landing:jsonld -->', `<script type="application/ld+json">\n${toJsonLd(buildJsonLd())}\n    </script>`)
          .replace(ICON_TOKEN, (_match, name, className) => icon(name, className));
        for (const [token, value] of Object.entries(TOKENS)) {
          output = output.replaceAll(token, escapeHtml(value));
        }
        return output;
      },
    },
  };
}
