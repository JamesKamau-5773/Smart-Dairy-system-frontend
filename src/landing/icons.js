// The app's icon set (lucide-react), rendered to static SVG for the landing page.
import { __iconNode as calculator } from 'lucide-react/dist/esm/icons/calculator.mjs';
import { __iconNode as check } from 'lucide-react/dist/esm/icons/check.mjs';
import { __iconNode as clipboardList } from 'lucide-react/dist/esm/icons/clipboard-list.mjs';
import { __iconNode as flame } from 'lucide-react/dist/esm/icons/flame.mjs';
import { __iconNode as handCoins } from 'lucide-react/dist/esm/icons/hand-coins.mjs';
import { __iconNode as mail } from 'lucide-react/dist/esm/icons/mail.mjs';
import { __iconNode as mapPin } from 'lucide-react/dist/esm/icons/map-pin.mjs';
import { __iconNode as messageCircle } from 'lucide-react/dist/esm/icons/message-circle.mjs';
import { __iconNode as milk } from 'lucide-react/dist/esm/icons/milk.mjs';
import { __iconNode as notebookPen } from 'lucide-react/dist/esm/icons/notebook-pen.mjs';
import { __iconNode as phone } from 'lucide-react/dist/esm/icons/phone.mjs';
import { __iconNode as plus } from 'lucide-react/dist/esm/icons/plus.mjs';
import { __iconNode as quote } from 'lucide-react/dist/esm/icons/quote.mjs';
import { __iconNode as shieldCheck } from 'lucide-react/dist/esm/icons/shield-check.mjs';
import { __iconNode as userPlus } from 'lucide-react/dist/esm/icons/user-plus.mjs';
import { __iconNode as users } from 'lucide-react/dist/esm/icons/users.mjs';
import { __iconNode as wallet } from 'lucide-react/dist/esm/icons/wallet.mjs';
import { __iconNode as wheat } from 'lucide-react/dist/esm/icons/wheat.mjs';
import { __iconNode as wifiOff } from 'lucide-react/dist/esm/icons/wifi-off.mjs';

const ICONS = {
  calculator,
  check,
  'clipboard-list': clipboardList,
  flame,
  'hand-coins': handCoins,
  mail,
  'map-pin': mapPin,
  'message-circle': messageCircle,
  milk,
  'notebook-pen': notebookPen,
  phone,
  plus,
  quote,
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className} shrink-0" aria-hidden="true" focusable="false">${children}</svg>`;
};
