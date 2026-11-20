// The landing page's only script: feature tabs and the page's action buttons.

// App showcase tabs (WAI-ARIA tabs pattern with automatic activation).
// Without this script every panel stays visible, see landing.css.
export function initShowcaseTabs(root = document) {
  const tablist = root.querySelector('[data-showcase-tabs]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panelFor = (tab) => root.getElementById(tab.getAttribute('aria-controls'));

  const select = (selected, { focus = false } = {}) => {
    tabs.forEach((tab) => {
      const isSelected = tab === selected;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      panelFor(tab)?.toggleAttribute('data-active', isSelected);
    });
    if (focus) selected.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      const target = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      select(tabs[target], { focus: true });
    });
  });
}

// The app route that starts a demo session. This static page has no API client or session, so
// the app does the sign-in and shows its progress, failures and rate limits.
export const DEMO_PATH = '/demo';

/**
 * "Try the live demo": marks the clicked button busy (so a second tap doesn't queue another
 * start) and opens the app's demo route.
 * @param {Event} event
 * @param {(url: string) => void} [go] For tests; defaults to a full page navigation.
 */
export function startDemo(event, go = (url) => window.location.assign(url)) {
  const button = event?.target?.closest?.('[data-action]');
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  }
  go(DEMO_PATH);
}

/** Click handlers for <button data-action="name">, keyed by name. */
export const ACTIONS = {
  demo: (event) => startDemo(event),
};

// Coming back with the browser's Back button can restore this page as it was left, busy button
// included; make the demo buttons usable again.
export function resetBusyActions(root = document) {
  root.querySelectorAll('[data-action][aria-busy="true"]').forEach((button) => {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  });
}

/** Routes clicks on [data-action] buttons to their handler. */
export function initActions(root = document, actions = ACTIONS) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-action]');
    if (!button) return;
    actions[button.dataset.action]?.(event);
  });
}

initShowcaseTabs();
initActions();
window.addEventListener('pageshow', (event) => {
  if (event.persisted) resetBusyActions();
});
