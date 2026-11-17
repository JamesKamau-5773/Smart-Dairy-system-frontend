// UX audit phase 6: English / Kiswahili. The choice is remembered, sets <html lang>, and every
// copy file follows it, with English for anything not translated yet.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, localizedCopy, setLocale } from '../locale';
import { shellCopy } from '../shell';
import { shellCopy as shellEn } from '../shell.en';
import { shellCopy as shellSw } from '../shell.sw';
import { authCopy as authEn } from '../auth.en';
import { authCopy as authSw } from '../auth.sw';
import { milkCopy as milkEn } from '../milk.en';
import { milkCopy as milkSw } from '../milk.sw';
import { errorsCopy as errorsEn } from '../errors.en';
import { errorsCopy as errorsSw } from '../errors.sw';
import { commonCopy as commonEn } from '../common.en';
import { commonCopy as commonSw } from '../common.sw';
import { productionCopy as productionEn } from '../production.en';
import { productionCopy as productionSw } from '../production.sw';
import { ledgerCopy as ledgerEn } from '../ledger.en';
import { ledgerCopy as ledgerSw } from '../ledger.sw';
import { sessionLabel } from '../production';
import { formatDate, formatDayLabel } from '../../lib/dateFormat';
import Confirmation from '../../components/ui/Confirmation';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import NotFound from '../../pages/NotFound';

afterEach(() => {
  cleanup();
  act(() => setLocale('en'));
  localStorage.clear();
});

describe('setLocale', () => {
  it('remembers the choice on this device and sets <html lang>', () => {
    setLocale('sw');
    expect(getLocale()).toBe('sw');
    expect(localStorage.getItem('maziwa.locale')).toBe('sw');
    expect(document.documentElement.lang).toBe('sw-KE');
    setLocale('en');
    expect(document.documentElement.lang).toBe('en-KE');
  });

  it('ignores a language the app doesn’t have', () => {
    setLocale('fr');
    expect(getLocale()).toBe('en');
  });
});

describe('localizedCopy', () => {
  const copy = localizedCopy({
    en: { title: 'Hello', nested: { count: (n) => `${n} cows`, list: ['a', 'b'] }, onlyEnglish: 'Only here' },
    sw: { title: 'Habari', nested: { count: (n) => `ng’ombe ${n}`, list: ['x', 'y'] } },
  });
  // Destructured once, at module level, as the copy files are used across the app.
  const { nested } = copy;

  it('reads the current language, even through a reference taken earlier', () => {
    expect(copy.title).toBe('Hello');
    setLocale('sw');
    expect(copy.title).toBe('Habari');
    expect(nested.count(3)).toBe('ng’ombe 3');
    expect(nested.list).toEqual(['x', 'y']);
  });

  it('falls back to English for anything not translated', () => {
    setLocale('sw');
    expect(copy.onlyEnglish).toBe('Only here');
  });

  it('can be listed like a plain object', () => {
    expect(Object.keys(copy)).toEqual(['title', 'nested', 'onlyEnglish']);
    setLocale('sw');
    expect(Object.entries(copy.nested).map(([key]) => key)).toEqual(['count', 'list']);
  });
});

// Every Kiswahili key must exist in English (a typo would silently never show), and every
// function must take the same arguments.
function compareShape(en, sw, path = '') {
  Object.entries(sw).forEach(([key, value]) => {
    const where = `${path}${key}`;
    expect(en, where).toHaveProperty([key]);
    if (typeof value === 'function') expect(value.length, where).toBe(en[key].length);
    else if (value && typeof value === 'object' && !Array.isArray(value)) compareShape(en[key], value, `${where}.`);
  });
}

// Every <area>.sw.js in src/i18n, found automatically so a new area is checked without editing this test.
const englishFiles = import.meta.glob('../*.en.js', { eager: true });
const kiswahiliFiles = import.meta.glob('../*.sw.js', { eager: true });
const areaOf = (file) => file.match(/\.\.\/(.+)\.(en|sw)\.js$/)[1];
const translationPairs = Object.entries(kiswahiliFiles).map(([file, sw]) => {
  const area = areaOf(file);
  return [area, Object.values(englishFiles[`../${area}.en.js`])[0], Object.values(sw)[0]];
});

describe('translations', () => {
  it('finds the hand-registered areas among the discovered ones', () => {
    const areas = translationPairs.map(([area]) => area);
    expect(areas).toEqual(expect.arrayContaining(['auth', 'shell', 'milk', 'errors', 'common', 'production', 'ledger']));
    expect([authSw, shellSw, milkSw, errorsSw, commonSw, productionSw, ledgerSw].every(Boolean)).toBe(true);
    expect([authEn, shellEn, milkEn, errorsEn, commonEn, productionEn, ledgerEn].every(Boolean)).toBe(true);
  });

  it.each(translationPairs)('%s.sw.js uses only keys that exist in English', (_area, en, sw) => {
    compareShape(en, sw);
  });

  it('gives every English copy file a Kiswahili file', () => {
    const missing = Object.keys(englishFiles).map(areaOf).filter((area) => !kiswahiliFiles[`../${area}.sw.js`]);
    expect(missing).toEqual([]);
  });

  // Screens must import the language-following wrapper (`i18n/feed`), never `i18n/feed.en`,
  // or they stay in English whatever language is chosen.
  it('has no screen importing an English copy file directly', () => {
    const sources = import.meta.glob(['../../**/*.{js,jsx}', '!../**', '!../../**/__tests__/**'], { eager: true, query: '?raw', import: 'default' });
    expect(Object.keys(sources).length).toBeGreaterThan(200);
    const offenders = Object.entries(sources)
      .filter(([, source]) => /from ['"][^'"]*i18n\/[a-z]+\.en['"]/.test(source))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});

describe('LanguageSwitch', () => {
  it('switches the app’s text and says which language is on', () => {
    render(<MemoryRouter><LanguageSwitch full /><NotFound variant="public" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: shellEn.notFound.title })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Kiswahili' }));

    expect(screen.getByRole('button', { name: 'Kiswahili' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.lang).toBe('sw-KE');
    // App remounts its routes on a language change; this page re-reads its copy on render.
    cleanup();
    render(<MemoryRouter><NotFound variant="public" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Hatukupata ukurasa huo' })).toBeTruthy();
    expect(shellCopy.notFound.title).toBe('Hatukupata ukurasa huo');
  });
});

describe('shared pieces in Kiswahili', () => {
  it('words dates, sessions and dialog defaults in the current language', () => {
    expect(formatDate('2026-08-04')).toBe('04 Aug 2026');
    expect(sessionLabel('midday')).toBe('Afternoon');
    setLocale('sw');
    expect(formatDate('2026-08-04')).toBe('04 Ago 2026');
    expect(formatDayLabel('2026-08-04')).toBe('Jnn 04 Ago');
    expect(sessionLabel('midday')).toBe('Mchana');
    expect(sessionLabel(null)).toBe('Haijulikani');

    render(<Confirmation isOpen onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ghairi' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thibitisha' })).toBeTruthy();
  });
});
