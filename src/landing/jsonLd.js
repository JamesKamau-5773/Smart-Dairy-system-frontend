import { FAQ, PLANS, SITE } from './content.js';

/**
 * schema.org structured data, built only from content.js so search results
 * match the visible page. No ratings or reviews are claimed.
 */
export const buildJsonLd = () => {
  const organizationId = `${SITE.url}/#organization`;
  const pricedPlans = PLANS.filter((plan) => plan.price != null);

  const softwareApplication = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE.url}/#software`,
    name: SITE.name,
    url: `${SITE.url}/`,
    image: SITE.ogImage,
    description: SITE.description,
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
        mainEntity: FAQ.items.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };
};

/** JSON for a <script> block. `<` is escaped so the data cannot close the tag. */
export const jsonLdScript = () => `<script type="application/ld+json">\n${JSON.stringify(buildJsonLd(), null, 2).replace(/</g, '\\u003c')}\n    </script>`;
