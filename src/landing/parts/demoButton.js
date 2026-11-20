import { escapeHtml } from '../html.js';
import { icon } from '../icons.js';

/**
 * The one "Try the live demo" control used across the page.
 * `action` names the click handler: landing.js looks it up in its ACTIONS map
 * (the static page's equivalent of an onClick prop).
 * @param {{ label: string, action: string }} demo
 * @param {{ className: string, withIcon?: boolean }} options
 */
export const demoButton = ({ label, action }, { className, withIcon = false }) => `<button type="button" data-action="${escapeHtml(action)}" class="${className}">${withIcon ? icon('play', 'size-[18px]') : ''}${escapeHtml(label)}</button>`;
