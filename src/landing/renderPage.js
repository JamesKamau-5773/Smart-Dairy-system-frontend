import {
  CLOSING_CTA, CONTACT, DASHBOARD_PREVIEW, DEMO_BUTTON, FAQ, FOOTER, HEADER, HERO, MORE_FEATURES,
  NAV_LINKS, PHOTOS, PLANS, PRICING, PROBLEMS, SHOWCASE, SITE, STEPS, TESTIMONIALS, TOP_BAR,
} from './content.js';
import { closingCta } from './sections/closingCta.js';
import { dashboardPreview } from './sections/dashboardPreview.js';
import { faq } from './sections/faq.js';
import { hero } from './sections/hero.js';
import { moreFeatures } from './sections/moreFeatures.js';
import { pricing } from './sections/pricing.js';
import { problems } from './sections/problems.js';
import { showcase } from './sections/showcase.js';
import { siteFooter } from './sections/siteFooter.js';
import { siteHeader } from './sections/siteHeader.js';
import { steps } from './sections/steps.js';
import { testimonials } from './sections/testimonials.js';
import { topBar } from './sections/topBar.js';

/**
 * The landing page body, top to bottom. This is the only place that reads
 * content.js for the body: each section receives its content as props.
 */
export const renderPage = ({ year = new Date().getFullYear() } = {}) => [
  topBar({ ...TOP_BAR, phone: CONTACT.phone, whatsapp: CONTACT.whatsapp }),
  siteHeader({ name: SITE.name, links: NAV_LINKS, ...HEADER }),
  '<main id="main">',
  hero({ copy: HERO, photo: PHOTOS.hero, demo: DEMO_BUTTON }),
  dashboardPreview(DASHBOARD_PREVIEW),
  problems(PROBLEMS),
  showcase(SHOWCASE),
  moreFeatures(MORE_FEATURES),
  steps(STEPS),
  faq(FAQ),
  testimonials({ copy: TESTIMONIALS, photo: PHOTOS.testimonials }),
  pricing({ copy: PRICING, plans: PLANS }),
  closingCta({ copy: CLOSING_CTA, photo: PHOTOS.cta }),
  '</main>',
  siteFooter({ name: SITE.name, year, footer: FOOTER }),
].join('\n');
