/**
 * Single source of truth for the public landing page (index.html).
 * Every word, link and image on the page is defined here. The section renderers
 * in src/landing/sections/ receive these values as props and hold no copy of
 * their own; the schema.org JSON-LD is built from the same values, so visible
 * content and structured data never drift apart.
 *
 * Design: design-reference/landing-reference.dc.html
 *
 * Fields listed in PLACEHOLDERS still hold stand-in values. `vite build` prints
 * a warning until the list is empty.
 */

/**
 * @typedef {{ label: string, href: string }} Link
 * @typedef {{ label: string, action: string }} ActionButton  Rendered as a <button data-action>. See landing.js.
 * @typedef {{
 *   name: string,
 *   alt: string,
 *   width: number,
 *   height: number,
 *   widths: number[],
 *   position: string,
 * }} Photo  A photo in public/images/. `npm run images` writes `widths` variants of it to public/images/landing/.
 * @typedef {{ quote: string, name: string, location: string, herd: string }} Testimonial
 * @typedef {{
 *   name: string,
 *   audience: string,
 *   price?: number | null,
 *   period: string,
 *   features: string[],
 *   highlighted: boolean,
 * }} Plan  `price` is the monthly price in KES. Leave it out (or null) while undecided.
 * @typedef {{ title: string, text: string, icon: string, tone?: 'danger' }} FeatureCard
 */

export const PLACEHOLDERS = [
  'SITE.email (temporary address)',
  'SITE.address',
  'SITE.legalName',
  'SITE.sameAs',
  'PLANS (prices)',
  'FOOTER.legal (Privacy and Terms pages)',
];

export const SITE = {
  name: 'Maziwa Smart',
  legalName: 'Maziwa Smart', // TODO: registered company name
  url: 'https://www.maziwasmart.co.ke',
  logo: 'https://www.maziwasmart.co.ke/brand/icon-512.png',
  ogImage: 'https://www.maziwasmart.co.ke/brand/og-image.png',
  phone: '+254 758 763 260', // international format for tel: links and JSON-LD
  phoneDisplay: '0758 763 260',
  whatsapp: '254758763260', // international format, digits only (used in wa.me links)
  email: 'jamesnk5773@gmail.com', // TODO: temporary, replace with a domain address
  address: {
    locality: 'Nairobi', // TODO
    region: 'Nairobi County', // TODO
    country: 'KE',
    display: 'Nairobi, Kenya',
  },
  sameAs: [], // TODO: Facebook, X, LinkedIn, YouTube profile URLs
  description: 'Dairy farm management software for Kenyan farmers: milk records, herd and breeding, feed, buyers, finances and staff, with offline support.',
};

/** <head> copy. Open Graph and Twitter share the og* values. */
export const SEO = {
  title: 'Maziwa Smart: Dairy Farm Management Software for Kenyan Farmers',
  description: 'Record milk per cow, track heat and calving, plan feed, manage buyers and know your cost per litre. Dairy farm software built for Kenyan farmers. Works offline.',
  ogDescription: 'Milk records, breeding, feed, buyers and money for your dairy farm, on your phone or computer. Works offline.',
  ogImageAlt: 'Maziwa Smart dairy farm management software',
};

/** Contact links, built once from SITE and reused by the top bar, pricing, closing CTA and footer. */
export const CONTACT = {
  phone: { label: 'Call us', value: SITE.phoneDisplay, href: `tel:${SITE.phone.replace(/\s+/g, '')}` },
  whatsapp: { label: 'WhatsApp', value: SITE.phoneDisplay, href: `https://wa.me/${SITE.whatsapp}` },
  email: { label: 'Email', value: SITE.email, href: `mailto:${SITE.email}` },
};

/** Where the page's calls to action go. */
export const ROUTES = {
  register: '/register',
  login: '/login',
};

/** @type {ActionButton} One definition for every "Try the live demo" button on the page. */
export const DEMO_BUTTON = { label: 'Try the live demo', action: 'demo' };

/** @type {Record<'hero' | 'testimonials' | 'cta', Photo>} */
export const PHOTOS = {
  hero: {
    name: 'calf',
    alt: 'A black and white dairy calf standing on straw in a farm shed',
    width: 1200,
    height: 1600,
    widths: [640, 960, 1200],
    position: 'center 58%',
  },
  testimonials: {
    name: 'testimonials-cows',
    alt: 'Dairy cows looking out through the feed rail of a farm shed',
    width: 1600,
    height: 939,
    widths: [640, 1024, 1600],
    position: 'center 40%',
  },
  cta: {
    name: 'cta-cows-feeding',
    alt: 'Dairy cows feeding side by side at a trough',
    width: 1600,
    height: 843,
    widths: [640, 1024, 1600],
    position: 'center 45%',
  },
};

export const TOP_BAR = {
  tagline: 'Smart records for Kenyan dairy farms',
  location: SITE.address.display,
};

/** @type {Link[]} */
export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Farmers', href: '#stories' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export const HEADER = {
  login: { label: 'Log in', href: ROUTES.login },
  start: { label: 'Start free', href: ROUTES.register },
};

export const HERO = {
  eyebrow: 'Dairy farm management for Kenya',
  title: 'Every litre. Every cow.',
  titleHighlight: 'Every shilling.',
  intro: 'Maziwa Smart replaces the milk notebook. Record milk per cow, catch every heat, plan feed and know which buyer owes you, from one account your whole farm shares.',
  start: { label: 'Start free', href: ROUTES.register },
  highlights: [
    { icon: 'devices', text: 'Phone, tablet or computer' },
    { icon: 'wifi-off', text: 'Keeps working without network' },
    { icon: 'users', text: 'One account for the whole team' },
  ],
};

/**
 * "Your whole farm on one screen": a static illustration of the app with
 * sample figures. It never calls the API; the figures are fixed text.
 */
export const DASHBOARD_PREVIEW = {
  eyebrow: 'The dashboard',
  title: 'Your whole farm on one screen',
  intro: 'Open Maziwa Smart on a computer in the office or a phone in the shed. Everyone on the farm sees the same records.',
  label: 'Maziwa Smart dashboard on a computer and the milk recording screen on a phone, shown with sample data',
  address: 'maziwasmart.co.ke/dashboard',
  workspaceLabel: 'Active Workspace',
  farm: 'Silato Farm',
  menu: [
    { items: ['Command Center'], active: 'Command Center' },
    { group: 'Operations', items: ['Production Log', 'Milk Usage', 'Daily Routine', 'Farm Task View'] },
    { group: 'Herd Management', items: ['Cow Register', 'AI & Pregnancy', 'Medical Records', 'Milk Drop Alerts'] },
    { group: 'Feed Planning', items: ['Feed Planner', 'Feed Mixing Planner'] },
    { group: 'Finance & Supply', items: ['Buyer List'] },
  ],
  page: 'Dashboard',
  status: 'Online',
  user: { name: 'Silato', role: 'Farmer' },
  heading: 'Daily Summary',
  subheading: 'Habari ya mchana',
  sampleLabel: 'Sample data',
  summary: [
    { label: 'Transaction revenue', value: 'KES 2,160', tone: 'outlined' },
    { label: 'Today’s feed cost', value: 'KES 980', tone: 'plain' },
    { label: 'Daily profit', value: 'KES 1,180', tone: 'tinted' },
  ],
  stats: [
    { label: 'Total milk (today)', value: '44.5', unit: 'Litres' },
    { label: 'Saleable milk (today)', value: '42.0', unit: 'Litres' },
    { label: 'Milk sold (today)', value: '36.0', unit: 'Litres' },
    { label: 'Milk remaining', value: '6.0', unit: 'Litres' },
    { label: 'Cows milked', value: '4', unit: 'Cows' },
    { label: 'Avg. per cow', value: '11.1', unit: 'L/cow' },
    { label: 'Profit per litre', value: '32.78', unit: 'KES', unitFirst: true },
  ],
  trend: {
    title: 'Milk Production Trend',
    ranges: ['30 days', '90 days', 'All time'],
    maxLitres: 60,
    yLabels: ['60 L', '45 L', '30 L', '15 L', '0 L'],
    xLabels: ['13 Oct', '20 Oct', '27 Oct', '3 Nov', 'Today'],
    litres: [43, 33, 21, 27, 31, 40, 46, 46, 44.5, 45, 45.5, 46, 43, 42, 48, 47, 47, 49, 26, 48, 44, 37, 38, 40, 40, 37, 36, 38, 42, 44.5],
  },
  phone: {
    eyebrow: 'Morning milking',
    title: 'Record milk',
    rows: [
      { cow: 'Sofia', litres: '13.0 L' },
      { cow: 'Princess', litres: '15.0 L' },
      { cow: 'Malkia', litres: '11.5 L', active: true },
    ],
    button: 'Save milking',
    status: 'Offline · will send later',
  },
};

/** @type {{ title: string, items: FeatureCard[] }} */
export const PROBLEMS = {
  title: 'Sound familiar?',
  items: [
    { icon: 'notebook-pen', title: 'The notebook goes missing', text: 'It gets wet, torn or misplaced, and nobody can say how much each cow gave last month.' },
    { icon: 'hand-coins', title: 'Payments slip through', text: 'Neighbours, hotels and the collection centre all take milk. Who has paid, and who still owes?' },
    { icon: 'flame', title: 'A heat is missed', text: 'One missed heat means weeks of lost milk and a longer wait for the next calf.', tone: 'danger' },
  ],
};

// Phone screenshots, cropped to the app (no status or browser bars). width/height are the files' pixel size.
const screen = (file, alt) => ({ src: `/images/showcase/${file}`, alt, width: 738, height: 1292 });

export const SHOWCASE = {
  title: 'Your whole dairy farm, in one app',
  intro: 'Milk, money, herd and feed, the way you already run your farm.',
  tabsLabel: 'What Maziwa Smart does',
  start: { label: 'Start free', href: ROUTES.register },
  tabs: [
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
        screen('buyers.jpg', 'Buyer List screen listing milk buyers with their rate and balance owed'),
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
  ],
};

/** @type {{ title: string, items: FeatureCard[] }} */
export const MORE_FEATURES = {
  title: 'Built for the real work of a farm',
  items: [
    { icon: 'wifi-off', title: 'Works offline', text: 'No network in the shed? Keep recording. Everything sends when you reconnect.' },
    { icon: 'shield-check', title: 'Milk safety', text: 'Keep treatment records and see which cows’ milk must not be sold yet.' },
    { icon: 'calculator', title: 'Cost per litre', text: 'Record income and expenses and find out which cows make you money.' },
    { icon: 'users', title: 'Staff and payroll', text: 'Give each milker and herdsman the right access, plan daily tasks and run payroll.' },
  ],
};

export const STEPS = {
  title: 'Start in three steps',
  items: [
    { icon: 'user-plus', title: 'Create your farm', text: 'Sign up with your phone in a few minutes.' },
    { icon: 'clipboard-list', title: 'Add your cows', text: 'Enter each cow’s name or tag. Add your workers if you have them.' },
    { icon: 'milk', title: 'Record the next milking', text: 'Log litres per cow and watch your records build up from day one.' },
  ],
};

export const FAQ = {
  title: 'Frequently asked questions',
  items: [
    {
      q: 'What is Maziwa Smart?',
      a: 'Maziwa Smart is dairy farm management software made for Kenyan farmers. It keeps your milk records, cow details, breeding dates, feed, buyers and money in one place, on your phone or computer.',
    },
    {
      q: 'Can I try it before I sign up?',
      a: 'Yes. Tap “Try the live demo” to look around a demo farm for a while, without creating an account.',
    },
    {
      q: 'Does it work without internet?',
      a: 'Yes. You can record milk and other daily work when the network is down. Maziwa Smart saves the entries on your phone and sends them automatically once you are back online.',
    },
    {
      q: 'Do I need a computer?',
      a: 'No. Maziwa Smart runs in the browser on any smartphone. You can add it to your home screen and open it like an app: on Android from the browser menu, on iPhone from Share, then Add to Home Screen.',
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
      q: 'Can I give buyers a receipt?',
      a: 'Yes. Every payment you record in the Ledger has a receipt you can preview, download as a PDF, or share from your phone, for example on WhatsApp.',
    },
    {
      q: 'Is my farm data safe?',
      a: 'Every farm’s records are kept separate, and only the people you add to your farm can see them. Each person signs in with their own phone number or email and password, or with Google.',
    },
    {
      q: 'Is it available in Kiswahili?',
      a: 'Yes. Switch between English and Kiswahili on the sign-in screen or from your profile menu. Your phone remembers the choice.',
    },
    {
      q: 'How much does it cost?',
      a: 'You can start free today. We are finalising our paid plans, and we will tell you before any of them begins. Call or WhatsApp us if you want to ask about pricing.',
    },
    {
      q: 'How do I get started?',
      a: 'Create an account, add your cows, and start recording milk the same day. If you need help setting up, call or WhatsApp us.',
    },
  ],
};

/**
 * Farmer stories: real quotes only, published with the farm's permission.
 * Add more entries here; the section renders one card per entry.
 * @type {{ eyebrow: string, title: string, intro: string, items: Testimonial[] }}
 */
export const TESTIMONIALS = {
  eyebrow: 'Farmer stories',
  title: 'From farmers using Maziwa Smart',
  intro: 'More farmer stories are on the way.',
  items: [
    {
      quote: 'Before Maziwa Smart, our production averaged 11 litres. Three months later, we average 18. Heat cycles are much clearer, and running the farm is no longer stressful. It is more efficient and saves us time.',
      name: 'Kamau’s Farm',
      location: 'Nakuru County',
      herd: '15 cows',
    },
    {
      quote: 'Before Maziwa Smart, we were guessing at our feed ratios and hoping for a good milk yield at the end of the month. Now we track our finances alongside the breeding records, so we know where every shilling goes and how it affects our output. It is the control centre our farm was missing.',
      name: 'Unaitas Farm',
      location: 'Kiambu County',
      herd: '25 cows',
    },
  ],
};

/**
 * Prices are not decided yet. A plan without a price shows the "Price coming
 * soon" tag and is left out of the JSON-LD offers. Adding `price: 1500` to a
 * plan is the only change needed to publish it.
 * @type {Plan[]}
 */
export const PLANS = [
  {
    name: 'Starter',
    period: 'month',
    audience: 'Small family farms getting off the notebook',
    features: [
      'Milk records for every cow, morning, midday and evening',
      'Herd register and cow history',
      'Heat, service and calving dates',
      'Works offline',
    ],
    highlighted: false,
  },
  {
    name: 'Farm',
    period: 'month',
    audience: 'Commercial farms with workers and buyers',
    features: [
      'Everything in Starter',
      'Feed rations and feed stock',
      'Buyer accounts and statements you can share',
      'Income, expenses and cost per litre',
      'Staff records and payroll',
    ],
    highlighted: true,
  },
  {
    name: 'Cooperative',
    period: 'month',
    audience: 'Dairy cooperatives and groups of farms',
    features: [
      'Everything in Farm',
      'Onboard member farmers',
      'Separate, private records per farm',
      'Member dashboards',
    ],
    highlighted: false,
  },
];

export const PRICING = {
  eyebrow: 'Pricing',
  title: 'Simple pricing in Kenya shillings',
  intro: 'We are finalising our plans. Start free today, and we will tell you before any paid plan begins.',
  comingSoon: 'Price coming soon',
  start: { label: 'Start free', href: ROUTES.register },
  ask: { label: 'Ask about pricing on WhatsApp', href: CONTACT.whatsapp.href },
};

export const CLOSING_CTA = {
  title: 'Put away the notebook',
  intro: 'Record tomorrow morning’s milking in Maziwa Smart and see every litre, cow and shilling in one place.',
  start: { label: 'Start free', href: ROUTES.register },
  chat: { label: 'Chat on WhatsApp', href: CONTACT.whatsapp.href },
};

export const FOOTER = {
  blurb: 'Dairy farm management software for Kenya. Milk, herd, feed and money in one place, on any device.',
  tags: ['Works offline', 'Phone, tablet, computer', SITE.address.display],
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Dashboard', href: '#product' },
        { label: 'Farmer stories', href: '#stories' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Get started',
      links: [
        { label: 'Start free', href: ROUTES.register },
        DEMO_BUTTON,
        { label: 'Log in', href: ROUTES.login },
      ],
    },
  ],
  contacts: [
    { ...CONTACT.phone, icon: 'phone', mono: true },
    { ...CONTACT.whatsapp, icon: 'message-circle', mono: true },
    { ...CONTACT.email, icon: 'mail' },
  ],
  rights: 'All rights reserved.',
  // Hidden until the pages exist: a link renders only when it has an href.
  legal: [
    { label: 'Privacy', href: null },
    { label: 'Terms', href: null },
  ],
};
