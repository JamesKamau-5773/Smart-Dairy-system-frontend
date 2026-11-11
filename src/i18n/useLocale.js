import { useSyncExternalStore } from 'react';
import { getLocale, setLocale, subscribeLocale } from './locale';

/**
 * The current language and a setter. Components that call it re-render when the language
 * changes; the routed pages are also remounted then (see App), so pages that read copy files
 * don't each need to call it.
 *
 * @returns {{ locale: 'en'|'sw', setLocale: (locale: 'en'|'sw') => void }}
 */
export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return { locale, setLocale };
}
