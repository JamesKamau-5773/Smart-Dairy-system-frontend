/**
 * Single source of truth for the public landing page (index.html).
 * The app showcase, farmer stories, pricing cards, FAQ markup and schema.org
 * JSON-LD are all rendered from this file at build time by
 * src/landing/landingPlugin.js, so visible content and structured data never
 * drift apart.
 *
 * Fields listed in PLACEHOLDERS still hold stand-in values. `vite build` prints
 * a warning until the list is empty.
 */

export const PLACEHOLDERS = [
  'SITE.email',
  'SITE.address',
  'SITE.legalName',
  'SITE.sameAs',
  'PLANS (names, prices, inclusions)',
  'public/og-image.png and public/logo.png artwork',
  'TESTIMONIALS (real farmer quotes)',
];

/** Hero photo. Set width/height to the real file's pixel size. */
export const HERO_IMAGE = {
  src: '/images/calf.jpg',
  alt: 'A black and white dairy calf standing on straw in its pen',
  width: 960,
  height: 1280,
};

// Phone screenshots, cropped to the app (no status or browser bars). width/height are the files' pixel size.
const screen = (file, alt) => ({ src: `/images/showcase/${file}`, alt, width: 738, height: 1292 });

export const SHOWCASE = [
  {
    id: 'milk',
    tab: 'Milk',
    icon: 'milk',
    headline: 'Know every litre, every day',
    benefits: [
      'Log milk per cow, morning and evening.',
      'See daily totals and verified entries.',
      'Spot a dip early, before it costs you.',
    ],
    screens: [
      screen('milklog.jpg', 'Daily Milk Log screen listing litres recorded per cow for the morning and evening milking'),
      screen('trend.jpg', 'Milk Production Trend chart showing the farm’s daily milk totals over time'),
    ],
  },
  {
    id: 'money',
    tab: 'Money',
    icon: 'wallet',
    headline: 'Know who owes you',
    benefits: [
      'Every buyer’s balance at a glance.',
      'An agreed rate per buyer.',
      'Milk statements sent on WhatsApp.',
    ],
    screens: [
      screen('buyers.jpg', 'Customer Billing screen listing milk buyers with their rate and balance owed'),
    ],
  },
  {
    id: 'herd',
    tab: 'Herd',
    icon: 'flame',
    headline: 'Never miss a heat',
    benefits: [
      'Alerts for cows in heat, with the next watch window.',
      'Log each AI service and the bull used.',
      'Pending vet checks and expected calving dates.',
    ],
    screens: [
      screen('herd.jpg', 'AI and Pregnancy screen with a cow-in-heat alert and a list of pending vet checks'),
    ],
  },
  {
    id: 'feed',
    tab: 'Feed',
    icon: 'wheat',
    headline: 'Feed every cow the right amount',
    benefits: [
      'A daily milk target for every cow.',
      'Kg per head and per feeding for each group.',
      'Groups for lactating cows, dry cows, calves and heifers.',
    ],
    screens: [
      screen('feed.jpg', 'Herd Feeding Groups screen showing kilograms of feed per head for each group'),
      screen('goals.jpg', 'Saved Cow Goals screen showing a daily milk target for each cow'),
    ],
  },
];

/**
 * Real farmer quotes only, with their permission. While this list is empty the
 * page shows clearly marked placeholder cards instead.
 * Shape: { quote, name, location, herd } e.g. herd: '12 cows'.
 */
export const TESTIMONIALS = [];

export const SITE = {
  name: 'Maziwa Smart',
  legalName: 'Maziwa Smart', // TODO: registered company name
  url: 'https://www.maziwasmart.co.ke',
  logo: 'https://www.maziwasmart.co.ke/logo.png',
  ogImage: 'https://www.maziwasmart.co.ke/og-image.png',
  phone: '+254 758 763 260', // international format for tel: links and JSON-LD
  phoneDisplay: '0758 763 260',
  whatsapp: '254758763260', // international format, digits only (used in wa.me links)
  email: 'hello@maziwasmart.co.ke', // TODO
  address: {
    locality: 'Nairobi', // TODO
    region: 'Nairobi County', // TODO
    country: 'KE',
  },
  sameAs: [], // TODO: Facebook, X, LinkedIn, YouTube profile URLs
};

/**
 * price: monthly price in KES, or null while pricing is unconfirmed.
 * A null price renders "Pricing coming soon" and is left out of JSON-LD offers.
 */
export const PLANS = [
  {
    name: 'Starter', // TODO
    price: null, // TODO
    period: 'month',
    audience: 'Small family farms getting off the notebook',
    features: [
      'Milk records for every cow, morning, midday and evening',
      'Herd register and cow history',
      'Heat, service and calving dates',
      'Works offline on your phone',
    ],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Farm', // TODO
    price: null, // TODO
    period: 'month',
    audience: 'Commercial farms with workers and buyers',
    features: [
      'Everything in Starter',
      'Feed rations and feed stock',
      'Buyer accounts and statements you can share',
      'Income, expenses and cost per litre',
      'Staff records and payroll',
    ],
    cta: 'Start free',
    highlighted: true,
  },
  {
    name: 'Cooperative', // TODO
    price: null, // TODO
    period: 'month',
    audience: 'Dairy cooperatives and groups of farms',
    features: [
      'Everything in Farm',
      'Onboard member farmers',
      'Separate, private records per farm',
      'Member dashboards',
    ],
    cta: 'Talk to us',
    highlighted: false,
  },
];

export const FAQS = [
  {
    q: 'What is Maziwa Smart?',
    a: 'Maziwa Smart is dairy farm management software made for Kenyan farmers. It keeps your milk records, cow details, breeding dates, feed, buyers and money in one place, on your phone or computer.',
  },
  {
    q: 'Does it work without internet?',
    a: 'Yes. You can record milk and other daily work when the network is down. Maziwa Smart saves the entries on your phone and sends them automatically once you are back online.',
  },
  {
    q: 'Do I need a computer?',
    a: 'No. Maziwa Smart runs in the browser on any smartphone. On Android you can add it to your home screen and open it like an app.',
  },
  {
    q: 'Can my workers use it too?',
    a: 'Yes. Add your milkers, herdsmen and clerks as staff. Each person only sees the pages you give them access to.',
  },
  {
    q: 'Is it suitable for a cooperative?',
    a: 'Yes. A cooperative can onboard its member farmers, and each farm keeps its own private records.',
  },
  {
    q: 'Is my farm data safe?',
    a: 'Every farm’s records are kept separate, and only the people you add to your farm can see them. You need a password to sign in.',
  },
  {
    q: 'Is it available in Kiswahili?',
    a: 'Maziwa Smart is in English today. Call or WhatsApp us if you need help in Kiswahili.', // TODO: update once a Kiswahili version is planned
  },
  {
    q: 'How do I get started?',
    a: 'Create an account, add your cows, and start recording milk the same day. If you need help setting up, call or WhatsApp us.',
  },
];
