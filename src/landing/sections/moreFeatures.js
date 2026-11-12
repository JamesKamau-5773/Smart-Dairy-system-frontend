import { each } from '../html.js';
import { featureCard } from '../parts/featureCard.js';
import { sectionHeading } from '../parts/sectionHeading.js';

/** "Built for the real work of a farm": four supporting features. */
export const moreFeatures = ({ title, items }) => `
<section aria-labelledby="more-features-title" class="border-b border-ink-200 bg-ground">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'more-features-title', title })}
    <ul class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">${each(items, (item) => featureCard(item))}
    </ul>
  </div>
</section>`;
