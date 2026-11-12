import { each, escapeHtml } from '../html.js';
import { icon } from '../icons.js';
import { linkButton } from '../parts/button.js';
import { sectionHeading } from '../parts/sectionHeading.js';

// Feature tabs (WAI-ARIA tabs pattern, wired up in landing.js).
// Without JavaScript every panel is shown and the tab bar is hidden, see landing.css.

const benefit = (text) => `
              <li class="flex gap-3">${icon('check', 'mt-0.5 size-5 text-brand')}<span>${escapeHtml(text)}</span></li>`;

const screenshot = (screen, offset) => `
            <figure class="w-1/2 max-w-[15rem] rounded-3xl bg-ink-900 p-2${offset ? ' md:mt-12' : ''}">
              <img src="${screen.src}" alt="${escapeHtml(screen.alt)}" width="${screen.width}" height="${screen.height}" loading="lazy" decoding="async" class="h-auto w-full rounded-modal bg-white" />
            </figure>`;

const tab = (item, index) => `
      <button type="button" role="tab" id="showcase-tab-${item.id}" aria-controls="showcase-panel-${item.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" class="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-[3px] border-transparent px-3 py-2 text-[16px] font-bold text-ink-600 transition-colors aria-[selected=false]:hover:border-ink-300 aria-[selected=false]:hover:text-ink-900 aria-selected:border-brand aria-selected:text-brand">${icon(item.icon)}${escapeHtml(item.tab)}</button>`;

const panel = (item, index, start) => `
      <div id="showcase-panel-${item.id}" role="tabpanel" aria-labelledby="showcase-tab-${item.id}" tabindex="0" data-showcase-panel${index === 0 ? ' data-active' : ''} class="grid items-center gap-10 pt-10 md:grid-cols-2">
        <div>
          <h3 class="text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-ink-900">${escapeHtml(item.headline)}</h3>
          <ul class="mt-6 space-y-4 text-[17px] text-ink-700">${each(item.benefits, benefit)}
          </ul>
          ${linkButton(start, { className: 'mt-8 w-full sm:w-auto' })}
        </div>
        <div class="flex items-start justify-center gap-4">${each(item.screens, (screen, screenIndex) => screenshot(screen, screenIndex > 0))}
        </div>
      </div>`;

/** The tab strip and panels on their own, so landing.js can be tested against them. */
export const showcaseTabs = ({ tabsLabel, tabs, start }) => `
    <div data-showcase-tabs role="tablist" aria-label="${escapeHtml(tabsLabel)}" class="flex overflow-x-auto border-b border-ink-200">${each(tabs, tab)}
    </div>${each(tabs, (item, index) => panel(item, index, start))}`;

/** "Your whole dairy farm, in one app" (#features). */
export const showcase = (props) => `
<section id="features" aria-labelledby="showcase-title" class="border-b border-ink-200 bg-white">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'showcase-title', title: props.title, intro: props.intro })}
    <div class="mt-10">${showcaseTabs(props)}
    </div>
  </div>
</section>`;
