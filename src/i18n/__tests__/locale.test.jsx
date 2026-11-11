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

describe('translations', () => {
  it.each([
    ['auth', authEn, authSw],
    ['shell', shellEn, shellSw],
    ['milk', milkEn, milkSw],
    ['errors', errorsEn, errorsSw],
  ])('%s.sw.js uses only keys that exist in English', (_name, en, sw) => {
    compareShape(en, sw);
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
