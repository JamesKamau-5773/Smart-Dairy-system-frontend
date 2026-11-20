import { each } from '../html.js';
import { featureCard } from '../parts/featureCard.js';
import { sectionHeading } from '../parts/sectionHeading.js';

/** "Start in three steps": numbered cards, in an ordered list. */
export const steps = ({ title, items }) => `
<section aria-labelledby="steps-title" class="border-b border-ink-200 bg-white">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'steps-title', title })}
    <ol class="mt-10 grid gap-6 md:grid-cols-3">${each(items, (item, index) => featureCard(item, { step: index + 1 }))}
    </ol>
  </div>
</section>`;
