import { cx, escapeHtml, externalRel } from '../html.js';
import { icon } from '../icons.js';

const BASE = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-button border font-bold transition-colors';

const VARIANTS = {
  primary: 'border-transparent bg-brand text-white hover:bg-brand-dark hover:text-white',
  light: 'border-ink-300 bg-white text-ink-900 hover:border-ink-400 hover:text-ink-900',
  outlineLight: 'border-white/65 text-white hover:bg-white/10 hover:text-white',
};

const SIZES = {
  md: 'px-5 py-3 text-[15px]',
  lg: 'px-[25px] py-[14px] text-[16px]',
  xl: 'px-[33px] py-[17px] text-[17px]',
};

/** Class list for a button-styled link or button. */
export const buttonClass = ({ variant = 'primary', size = 'lg', className } = {}) => cx(BASE, VARIANTS[variant], SIZES[size], className);

/** A link styled as a button. `link` is { label, href }. */
export const linkButton = (link, { iconName, ...style } = {}) => `<a href="${escapeHtml(link.href)}"${externalRel(link.href)} class="${buttonClass(style)}">${iconName ? icon(iconName, 'size-[18px]') : ''}${escapeHtml(link.label)}</a>`;
