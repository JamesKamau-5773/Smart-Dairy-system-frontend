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

initShowcaseTabs();
