import { beforeEach, describe, expect, it } from 'vitest';
import { renderShowcase } from '../landingPlugin.js';
import { SHOWCASE } from '../content.js';
import { initShowcaseTabs } from '../landing.js';

const tabs = () => [...document.querySelectorAll('[role="tab"]')];
const activePanels = () => [...document.querySelectorAll('[data-showcase-panel][data-active]')].map((panel) => panel.id);
const press = (tab, key) => tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('showcase tabs', () => {
  beforeEach(() => {
    document.body.innerHTML = renderShowcase();
    initShowcaseTabs();
  });

  it('shows the panel of the clicked tab only', () => {
    tabs()[2].click();

    expect(activePanels()).toEqual([`showcase-panel-${SHOWCASE[2].id}`]);
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false']);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it('moves selection and focus with arrow keys, wrapping at the ends', () => {
    press(tabs()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs()[3]);
    expect(activePanels()).toEqual([`showcase-panel-${SHOWCASE[3].id}`]);

    press(tabs()[3], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('jumps to the first and last tab with Home and End', () => {
    press(tabs()[1], 'End');
    expect(document.activeElement).toBe(tabs()[3]);

    press(tabs()[3], 'Home');
    expect(document.activeElement).toBe(tabs()[0]);
    expect(activePanels()).toEqual([`showcase-panel-${SHOWCASE[0].id}`]);
  });
});
