import { escapeHtml } from '../html.js';

// The calf mark from the design: white head and ears on a brand-blue tile, brand-blue patches.
const CALF = `<svg aria-hidden="true" focusable="false" width="28" height="28" viewBox="0 0 32 32" class="text-brand"><ellipse cx="5.5" cy="11.5" rx="5" ry="3" transform="rotate(-18 5.5 11.5)" fill="#FFFFFF"/><ellipse cx="26.5" cy="11.5" rx="5" ry="3" transform="rotate(18 26.5 11.5)" fill="#FFFFFF"/><path d="M9 10C9 5 23 5 23 10L22 20C22 27 10 27 10 20Z" fill="#FFFFFF"/><path d="M9.3 10.5C11.5 8.5 14.5 9.5 14 14.5C13.7 18 10.8 18.5 10 16.5Z" fill="currentColor"/><path d="M22.7 10.5C20.5 8.5 17.5 9.5 18 14.5C18.3 18 21.2 18.5 22 16.5Z" fill="currentColor"/><circle cx="14" cy="22.3" r="1" fill="currentColor"/><circle cx="18" cy="22.3" r="1" fill="currentColor"/></svg>`;

/** The calf mark on its tile. */
export const logoMark = () => `<span class="flex size-[34px] shrink-0 items-center justify-center rounded-button bg-brand">${CALF}</span>`;

/** Mark plus the product name. */
export const logo = (name, { className }) => `<span class="${className}">${logoMark()}${escapeHtml(name)}</span>`;
