import { cx, escapeHtml } from '../html.js';

const TITLE_SIZES = {
  md: 'text-[clamp(1.75rem,4.5vw,2.375rem)] leading-[1.12]', // 38px
  lg: 'text-[clamp(2rem,5.5vw,2.75rem)] leading-[1.1]', // 44px
};

const TONES = {
  dark: { eyebrow: 'text-brand', title: 'text-ink-900', intro: 'text-ink-600' },
  light: { eyebrow: 'text-glow', title: 'text-white', intro: 'text-mist-200' },
};

/**
 * Eyebrow, h2 and intro for a section. Every field but `id` and `title` is optional.
 * @param {{ id: string, title: string, eyebrow?: string, intro?: string, align?: 'left' | 'center', tone?: 'dark' | 'light', size?: 'md' | 'lg', className?: string }} props
 */
export const sectionHeading = ({ id, title, eyebrow, intro, align = 'left', tone = 'dark', size = 'md', className }) => {
  const colours = TONES[tone];
  return `
    <div class="${cx(align === 'center' ? 'mx-auto max-w-[720px] text-center' : 'max-w-[720px]', className)}">
      ${eyebrow ? `<p class="mb-3.5 text-[13px] font-bold uppercase tracking-[0.1em] ${colours.eyebrow}">${escapeHtml(eyebrow)}</p>` : ''}
      <h2 id="${id}" class="m-0 font-extrabold tracking-[-0.03em] ${TITLE_SIZES[size]} ${colours.title}">${escapeHtml(title)}</h2>
      ${intro ? `<p class="mt-4 text-[17px] leading-relaxed ${colours.intro}">${escapeHtml(intro)}</p>` : ''}
    </div>`;
};
