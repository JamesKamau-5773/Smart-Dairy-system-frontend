import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Open traps, innermost last. Only the innermost one handles keys, so a confirmation opened
// over a form keeps its own focus and Escape closes just the confirmation.
const openTraps = [];

const focusablesIn = (container) => [...container.querySelectorAll(FOCUSABLE)]
  .filter((element) => !element.hidden && !element.closest('[hidden], [inert]'));

/**
 * Keeps keyboard focus inside a drawer or dialog while it is open: Tab and Shift+Tab wrap
 * around, Escape calls `onEscape`, and on close focus goes back to what had it before
 * (usually the button that opened it). Focus moves in on open unless it is already inside.
 * Traps stack: while a dialog is open over another, only the top one responds.
 *
 * @param {React.RefObject<HTMLElement>} containerRef The drawer or dialog element.
 * @param {boolean} active Whether it is open.
 * @param {object} [options]
 * @param {() => void} [options.onEscape] Usually the close handler.
 *
 * @example
 * const panelRef = useRef(null);
 * useFocusTrap(panelRef, isOpen, { onEscape: onClose });
 * <div ref={panelRef} tabIndex={-1}>…</div>
 */
export function useFocusTrap(containerRef, active, { onEscape } = {}) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => { onEscapeRef.current = onEscape; });

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return undefined;
    const previouslyFocused = document.activeElement;
    const trap = {};
    openTraps.push(trap);

    if (!container.contains(document.activeElement)) (focusablesIn(container)[0] ?? container).focus();

    const onKeyDown = (event) => {
      if (openTraps[openTraps.length - 1] !== trap) return;
      if (event.key === 'Escape') {
        if (!event.defaultPrevented) onEscapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusablesIn(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = container.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openTraps.splice(openTraps.indexOf(trap), 1);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [active, containerRef]);
}
