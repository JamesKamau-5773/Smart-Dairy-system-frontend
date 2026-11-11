import { isFeatureEnabled } from '../lib/featureFlags';

// The app's language: English or Kiswahili. One module-level value so text read outside React
// (error messages, toasts) follows the same choice as the screens. With the `kiswahili` flag off
// the app stays in English and the choice can't be changed.

/** Supported languages, with the `lang` attribute each sets on <html>. */
export const LOCALES = Object.freeze({
  en: { htmlLang: 'en-KE', name: 'English' },
  sw: { htmlLang: 'sw-KE', name: 'Kiswahili' },
});
export const DEFAULT_LOCALE = 'en';

// A device preference, not farm data: it holds only "en" or "sw" and is read before anyone has
// signed in (the login screen needs it), so it isn't scoped per user or farm.
const STORAGE_KEY = 'maziwa.locale';

const isLocale = (value) => Object.hasOwn(LOCALES, value);

/** Whether the language can be switched (the `kiswahili` feature flag). */
export const canSwitchLocale = () => isFeatureEnabled('kiswahili');

function readStoredLocale() {
  if (!canSwitchLocale()) return DEFAULT_LOCALE;
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

let currentLocale = readStoredLocale();
const listeners = new Set();

function applyHtmlLang(locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = LOCALES[locale].htmlLang;
}
applyHtmlLang(currentLocale);

/** The current language code ("en" or "sw"). */
export function getLocale() {
  return currentLocale;
}

/** Switches language, remembers it on this device and updates <html lang>. Unknown codes are ignored. */
export function setLocale(locale) {
  if (!canSwitchLocale() || !isLocale(locale) || locale === currentLocale) return;
  currentLocale = locale;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Private mode or blocked storage: the choice lasts until the page is closed.
  }
  applyHtmlLang(locale);
  listeners.forEach((listener) => listener());
}

/** Calls `listener` whenever the language changes; returns an unsubscribe function. */
export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function valueAt(root, path) {
  return path.reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), root);
}

/**
 * Wraps a copy file's languages so screens keep reading it like a plain object
 * (`authCopy.login.title`, `const { forgot: copy } = authCopy`) while every read returns the
 * current language. A key the translation lacks falls back to English, so a partly translated
 * file is safe to ship.
 *
 * @template T
 * @param {{ en: T, sw?: object }} translations
 * @returns {T}
 */
export function localizedCopy(translations) {
  const proxies = new Map();

  const resolve = (path) => {
    const translated = valueAt(translations[currentLocale], path);
    return translated === undefined ? valueAt(translations.en, path) : translated;
  };

  const proxyFor = (path) => {
    const cacheKey = path.join('\u0000');
    if (proxies.has(cacheKey)) return proxies.get(cacheKey);
    const proxy = new Proxy({}, {
      get(_target, key) {
        if (typeof key === 'symbol') return undefined;
        const value = resolve([...path, key]);
        return isPlainObject(value) ? proxyFor([...path, key]) : value;
      },
      has: (_target, key) => typeof key === 'string' && resolve([...path, key]) !== undefined,
      ownKeys: () => Object.keys(valueAt(translations.en, path) ?? {}),
      getOwnPropertyDescriptor(_target, key) {
        const value = resolve([...path, key]);
        if (value === undefined) return undefined;
        return { enumerable: true, configurable: true, writable: false, value: isPlainObject(value) ? proxyFor([...path, key]) : value };
      },
    });
    proxies.set(cacheKey, proxy);
    return proxy;
  };

  return proxyFor([]);
}
