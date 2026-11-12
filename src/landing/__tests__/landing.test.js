import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_BUTTON, SHOWCASE } from '../content.js';
import { initActions, initShowcaseTabs } from '../landing.js';
import { demoButton } from '../parts/demoButton.js';
import { showcaseTabs } from '../sections/showcase.js';

const tabs = () => [...document.querySelectorAll('[role="tab"]')];
const activePanels = () => [...document.querySelectorAll('[data-showcase-panel][data-active]')].map((panel) => panel.id);
const press = (tab, key) => tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
const panelId = (index) => `showcase-panel-${SHOWCASE.tabs[index].id}`;

describe('showcase tabs', () => {
  beforeEach(() => {
    document.body.innerHTML = showcaseTabs(SHOWCASE);
    initShowcaseTabs();
  });

  it('shows the panel of the clicked tab only', () => {
    tabs()[2].click();

    expect(activePanels()).toEqual([panelId(2)]);
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false']);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it('moves selection and focus with arrow keys, wrapping at the ends', () => {
    press(tabs()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs()[3]);
    expect(activePanels()).toEqual([panelId(3)]);

    press(tabs()[3], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('jumps to the first and last tab with Home and End', () => {
    press(tabs()[1], 'End');
    expect(document.activeElement).toBe(tabs()[3]);

    press(tabs()[3], 'Home');
    expect(document.activeElement).toBe(tabs()[0]);
    expect(activePanels()).toEqual([panelId(0)]);
  });
});

describe('action buttons', () => {
  it('calls the handler named by the button, including clicks on its icon', () => {
    const container = document.createElement('div');
    container.innerHTML = demoButton(DEMO_BUTTON, { className: 'btn', withIcon: true });
    const demo = vi.fn();
    initActions(container, { [DEMO_BUTTON.action]: demo });

    container.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(demo).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks elsewhere and actions with no handler', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>text</p><button type="button" data-action="unknown">x</button>';
    const demo = vi.fn();
    initActions(container, { demo });

    container.querySelector('p').click();
    container.querySelector('button').click();
    expect(demo).not.toHaveBeenCalled();
  });
});
