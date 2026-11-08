import { useEffect } from 'react';

const isTypingIn = (element) => element instanceof HTMLElement
  && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable);

/**
 * Makes sure a new error is seen: scrolls it into view and, unless the person is
 * typing in a field, moves keyboard focus to it so the next Tab continues from
 * there. Screen readers already announce it through role="alert".
 */
export function useDrawAttention(ref, enabled) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (!isTypingIn(document.activeElement)) element.focus({ preventScroll: true });
  }, [ref, enabled]);
}
