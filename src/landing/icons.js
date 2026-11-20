// The app's icon set (lucide-react), rendered to static SVG for the landing page.
import { __iconNode as calculator } from 'lucide-react/dist/esm/icons/calculator.mjs';
import { __iconNode as check } from 'lucide-react/dist/esm/icons/check.mjs';
import { __iconNode as clipboardList } from 'lucide-react/dist/esm/icons/clipboard-list.mjs';
import { __iconNode as flame } from 'lucide-react/dist/esm/icons/flame.mjs';
import { __iconNode as handCoins } from 'lucide-react/dist/esm/icons/hand-coins.mjs';
import { __iconNode as mail } from 'lucide-react/dist/esm/icons/mail.mjs';
import { __iconNode as messageCircle } from 'lucide-react/dist/esm/icons/message-circle.mjs';
import { __iconNode as milk } from 'lucide-react/dist/esm/icons/milk.mjs';
import { __iconNode as notebookPen } from 'lucide-react/dist/esm/icons/notebook-pen.mjs';
import { __iconNode as phone } from 'lucide-react/dist/esm/icons/phone.mjs';
import { __iconNode as plus } from 'lucide-react/dist/esm/icons/plus.mjs';
import { __iconNode as shieldCheck } from 'lucide-react/dist/esm/icons/shield-check.mjs';
import { __iconNode as userPlus } from 'lucide-react/dist/esm/icons/user-plus.mjs';
import { __iconNode as users } from 'lucide-react/dist/esm/icons/users.mjs';
import { __iconNode as wallet } from 'lucide-react/dist/esm/icons/wallet.mjs';
import { __iconNode as wheat } from 'lucide-react/dist/esm/icons/wheat.mjs';
import { __iconNode as wifiOff } from 'lucide-react/dist/esm/icons/wifi-off.mjs';

// Drawn for the landing design (design-reference/landing-reference.dc.html), in lucide's node format.
const devices = [
  ['rect', { x: '2', y: '4', width: '14', height: '10', rx: '1.5' }],
  ['path', { d: 'M1 18h16' }],
  ['rect', { x: '18', y: '8', width: '5', height: '10', rx: '1' }],
];
const play = [
  ['circle', { cx: '12', cy: '12', r: '9' }],
  ['path', { d: 'M10 8.5l5.5 3.5-5.5 3.5z' }],
];
const quoteMark = [
  ['path', { d: 'M0 28V16C0 7 5 1.5 14 0v5.5C9.5 6.5 8 9.5 8 13h6v15zm20 0V16C20 7 25 1.5 34 0v5.5C29.5 6.5 28 9.5 28 13h6v15z', fill: 'currentColor', stroke: 'none' }],
];

// Icons drawn on a canvas other than lucide's 24x24.
const VIEW_BOXES = { 'quote-mark': '0 0 36 28' };

const ICONS = {
  calculator,
  devices,
  play,
  'quote-mark': quoteMark,
  check,
  'clipboard-list': clipboardList,
  flame,
  'hand-coins': handCoins,
  mail,
  'message-circle': messageCircle,
  milk,
  'notebook-pen': notebookPen,
  phone,
  plus,
  'shield-check': shieldCheck,
  'user-plus': userPlus,
  users,
  wallet,
  wheat,
  'wifi-off': wifiOff,
};

const renderAttributes = (attributes) => Object.entries(attributes)
  .filter(([name]) => name !== 'key')
  .map(([name, value]) => `${name}="${value}"`)
  .join(' ');

/** Decorative inline SVG with lucide's default attributes. Size it with the className. */
export const icon = (name, className = 'size-5') => {
  const node = ICONS[name];
  if (!node) throw new Error(`Unknown landing icon "${name}". Add it to src/landing/icons.js.`);

  const children = node.map(([tag, attributes]) => `<${tag} ${renderAttributes(attributes)} />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOXES[name] ?? '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className} shrink-0" aria-hidden="true" focusable="false">${children}</svg>`;
};
