import { cx, each, escapeHtml } from '../html.js';
import { sectionHeading } from '../parts/sectionHeading.js';
import { brandLogo } from '../parts/logo.js';

/*
 * "Your whole farm on one screen": a drawing of the app on a computer and a
 * phone. It is a static illustration with fixed sample figures from
 * content.js. Nothing here reads farm data or calls the API.
 * Screen readers get one role="img" label; the mock itself is aria-hidden.
 */

const SUMMARY_TONES = {
  outlined: { card: 'border-[#7CC4EE] bg-white', label: 'text-ink-600', value: 'text-brand' },
  plain: { card: 'border-[#EDF0F3] bg-white', label: 'text-ink-600', value: 'text-ink-900' },
  tinted: { card: 'border-[#A9CFE6] bg-[#EAF0F4]', label: 'text-brand', value: 'text-brand' },
};

const CHART = { width: 600, top: 10, bottom: 160, firstX: 10, stepX: 20 };

/** SVG path through the sample litres, on the chart's 600x170 canvas. */
const trendLine = (litres, maxLitres) => litres
  .map((value, index) => {
    const x = CHART.firstX + index * CHART.stepX;
    const y = CHART.bottom - (value / maxLitres) * (CHART.bottom - CHART.top);
    return `${index === 0 ? 'M' : 'L'}${x} ${Number(y.toFixed(1))}`;
  })
  .join('');

const browserBar = (address) => `
      <div class="flex items-center gap-1.5 border-b border-[#EDF0F3] bg-white px-4 py-3">
        <span class="size-[9px] rounded-full bg-ink-300"></span><span class="size-[9px] rounded-full bg-ink-300"></span><span class="size-[9px] rounded-full bg-ink-300"></span>
        <span class="ml-3 flex-1 truncate rounded-[6px] border border-ink-200 px-2.5 py-1 font-mono text-[11px] text-ink-600">${escapeHtml(address)}</span>
      </div>`;

const sidebar = ({ workspaceLabel, farm, menu }) => `
        <div class="hidden w-[184px] shrink-0 flex-col border-r border-ink-200 bg-white text-xs font-semibold text-ink-700 lg:flex">
          <div class="bg-[#0F1B2D] px-4 py-3">${brandLogo({ variant: 'horizontal', tone: 'dark', size: 32 })}</div>
          <div class="border-b border-[#EDF0F3] px-3 pb-2.5 pt-3">
            <div class="mb-1.5 text-[10px]">${escapeHtml(workspaceLabel)}</div>
            <div class="flex justify-between rounded-button border border-ink-300 px-2.5 py-2 text-brand"><span>${escapeHtml(farm)}</span><span>⌄</span></div>
          </div>
          <div class="flex flex-col gap-0.5 px-3 py-2.5">${each(menu, ({ group, items, active }) => `
            ${group ? `<div class="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-500">${escapeHtml(group)}</div>` : ''}${each(items, (item) => (item === active
    ? `<div class="rounded-button bg-[#0F1B2D] px-3 py-2.5 font-bold text-white">${escapeHtml(item)}</div>`
    : `<div class="px-3 py-[7px]">${escapeHtml(item)}</div>`))}`)}
          </div>
        </div>`;

const topStrip = ({ page, farm, status, user }) => `
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-white px-5 py-2.5 text-xs font-bold">
            <span class="text-[13px]">${escapeHtml(page)}</span>
            <span class="flex items-center gap-2">
              <span class="rounded-full border border-[#BFDCEE] bg-[#EAF3F9] px-2.5 py-1 text-[11px] text-brand">${escapeHtml(farm)}</span>
              <span class="hidden rounded-button border border-ink-200 px-2.5 py-1.5 sm:inline">${escapeHtml(status)}</span>
              <span class="hidden rounded-button border border-ink-200 px-2.5 py-1.5 sm:inline">${escapeHtml(user.name)} · <span class="text-[10px] uppercase text-ink-600">${escapeHtml(user.role)}</span></span>
            </span>
          </div>`;

const summaryCard = ({ label, value, tone }) => {
  const colours = SUMMARY_TONES[tone];
  return `
              <div class="rounded-[10px] border px-4 py-3.5 ${colours.card}">
                <div class="text-[10px] font-bold uppercase tracking-[0.06em] ${colours.label}">${escapeHtml(label)}</div>
                <div class="mt-1.5 text-[20px] font-extrabold ${colours.value}">${escapeHtml(value)}</div>
              </div>`;
};

const statCard = ({ label, value, unit, unitFirst }) => {
  const unitHtml = `<span class="text-[11px] font-semibold text-ink-600">${escapeHtml(unit)}</span>`;
  return `
              <div class="rounded-[10px] border border-ink-200 border-t-2 border-t-brand-accent bg-white px-4 py-3.5">
                <div class="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-600">${escapeHtml(label)}</div>
                <div class="mt-1.5 h-0.5 w-[22px] bg-brand"></div>
                <div class="mt-[22px] text-[24px] font-extrabold text-brand">${unitFirst ? `${unitHtml} ${escapeHtml(value)}` : `${escapeHtml(value)} ${unitHtml}`}</div>
              </div>`;
};

const trendChart = ({ title, ranges, maxLitres, yLabels, xLabels, litres }) => {
  const line = trendLine(litres, maxLitres);
  const gridLines = yLabels.map((_, index) => {
    const y = CHART.top + (index * (CHART.bottom - CHART.top)) / (yLabels.length - 1);
    return `M0 ${y}H${CHART.width}`;
  }).join('');
  return `
            <div class="rounded-card border border-[#A9CFE6] bg-white px-[18px] py-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div class="text-sm font-extrabold text-brand">${escapeHtml(title)}</div>
                <div class="flex items-center gap-0.5 rounded-full border border-ink-200 p-[3px] text-[10px] font-bold text-ink-600">${each(ranges, (range, index) => (index === 0
    ? `<span class="rounded-full bg-brand px-2.5 py-1 text-white">${escapeHtml(range)}</span>`
    : `<span class="px-2 py-1">${escapeHtml(range)}</span>`))}</div>
              </div>
              <div class="flex gap-2">
                <div class="flex h-[170px] flex-col justify-between text-right text-[10px] font-semibold text-ink-600">${each(yLabels, (label) => `<span>${escapeHtml(label)}</span>`)}</div>
                <div class="min-w-0 flex-1">
                  <svg viewBox="0 0 ${CHART.width} 170" preserveAspectRatio="none" class="block h-[170px] w-full">
                    <path d="${gridLines}" stroke="#EDF0F3" stroke-width="1" fill="none" vector-effect="non-scaling-stroke" />
                    <path d="${line}V${CHART.bottom}H${CHART.firstX}Z" class="fill-brand" fill-opacity="0.07" />
                    <path d="${line}" fill="none" class="stroke-brand" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                  </svg>
                  <div class="flex justify-between pt-1.5 text-[10px] font-semibold text-ink-600">${each(xLabels, (label) => `<span>${escapeHtml(label)}</span>`)}</div>
                </div>
              </div>
            </div>`;
};

const phoneMock = ({ eyebrow, title, rows, button, status }) => `
    <div class="landing-float absolute bottom-0 right-0 w-[150px] rounded-[30px] bg-ink-900 p-[7px] shadow-[0_30px_60px_rgba(15,23,42,0.30)] sm:w-[196px]">
      <div class="flex flex-col gap-2.5 rounded-[24px] bg-white px-3.5 pb-4 pt-[22px]">
        <div class="text-[10px] font-bold uppercase tracking-[0.08em] text-brand">${escapeHtml(eyebrow)}</div>
        <div class="text-[15px] font-extrabold tracking-[-0.01em]">${escapeHtml(title)}</div>${each(rows, (row) => `
        <div class="${cx('flex items-center justify-between rounded-[7px] text-xs font-bold', row.active ? 'border-2 border-brand px-2 py-[7px]' : 'border border-ink-200 px-[9px] py-2')}"><span>${escapeHtml(row.cow)}</span><span class="${cx('font-mono', row.active && 'text-brand')}">${escapeHtml(row.litres)}</span></div>`)}
        <div class="rounded-[7px] bg-brand p-[9px] text-center text-xs font-bold text-white">${escapeHtml(button)}</div>
        <div class="text-center text-[10px] text-ink-600">${escapeHtml(status)}</div>
      </div>
    </div>`;

/** @param {typeof import('../content.js').DASHBOARD_PREVIEW} props */
export const dashboardPreview = (props) => `
<section id="product" aria-labelledby="product-title" class="overflow-hidden border-b border-ink-200 bg-white">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'product-title', eyebrow: props.eyebrow, title: props.title, intro: props.intro, align: 'center', className: 'mb-12' })}
    <div role="img" aria-label="${escapeHtml(props.label)}" class="relative mx-auto max-w-[1120px] pb-16 pr-6 [perspective:1800px] sm:pr-[44px]">
      <div aria-hidden="true" class="landing-tilt relative origin-top overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_40px_90px_rgba(15,23,42,0.14),0_4px_14px_rgba(15,23,42,0.05)]">${browserBar(props.address)}
        <div class="flex">${sidebar(props)}
          <div class="flex min-w-0 flex-1 flex-col bg-[#F8F7F5]">${topStrip(props)}
            <div class="flex flex-col gap-3.5 px-4 pb-[26px] pt-[22px] sm:px-7">
              <div class="border-b border-ink-200 pb-3">
                <div class="text-[22px] font-extrabold tracking-[-0.03em] text-brand">${escapeHtml(props.heading)}</div>
                <div class="mt-[3px] text-[11px] text-ink-600">${escapeHtml(props.subheading)} · <span class="font-bold">${escapeHtml(props.sampleLabel)}</span></div>
              </div>
              <div class="grid gap-3 sm:grid-cols-3">${each(props.summary, summaryCard)}
              </div>
              <div class="grid grid-cols-2 gap-3 md:grid-cols-4">${each(props.stats, statCard)}
              </div>${trendChart(props.trend)}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true">${phoneMock(props.phone)}
      </div>
    </div>
  </div>
</section>`;
