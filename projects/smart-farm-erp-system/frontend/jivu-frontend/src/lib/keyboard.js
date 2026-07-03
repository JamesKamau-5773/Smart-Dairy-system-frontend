/**
 * Keyboard shortcuts and keyboard navigation utilities
 */

/**
 * Hook to handle keyboard shortcuts globally
 * Usage: useKeyboardShortcuts([
 *   { key: 'k', ctrlOrCmd: true, callback: handleSearch },
 *   { key: 'Escape', callback: handleClose }
 * ])
 */
export function useKeyboardShortcuts(shortcuts) {
  React.useEffect(() => {
    if (!shortcuts || shortcuts.length === 0) return;

    const handleKeyDown = (event) => {
      shortcuts.forEach(({ key, ctrlOrCmd = false, shiftKey = false, altKey = false, callback, preventDefault = true }) => {
        const isMatch =
          event.key === key &&
          (ctrlOrCmd ? event.ctrlKey || event.metaKey : true) &&
          (shiftKey === false || event.shiftKey === shiftKey) &&
          (altKey === false || event.altKey === altKey);

        if (isMatch) {
          if (preventDefault) event.preventDefault();
          callback(event);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcut definitions
 */
export const CommonShortcuts = {
  // Search
  search: { key: 'k', ctrlOrCmd: true, description: 'Search' },
  find: { key: 'f', ctrlOrCmd: true, description: 'Find on page' },

  // Navigation
  escape: { key: 'Escape', description: 'Close modal / Cancel' },
  enter: { key: 'Enter', description: 'Submit form' },
  tab: { key: 'Tab', description: 'Navigate forward' },
  shiftTab: { key: 'Tab', shiftKey: true, description: 'Navigate backward' },

  // Actions
  save: { key: 's', ctrlOrCmd: true, description: 'Save' },
  delete: { key: 'Delete', description: 'Delete' },
  undo: { key: 'z', ctrlOrCmd: true, description: 'Undo' },
  redo: { key: 'z', ctrlOrCmd: true, shiftKey: true, description: 'Redo' },

  // Navigation
  help: { key: '?', description: 'Show help' },
  previous: { key: 'ArrowLeft', description: 'Previous item' },
  next: { key: 'ArrowRight', description: 'Next item' },
};

/**
 * Check if event matches a keyboard shortcut
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Object} shortcut - Shortcut definition
 * @returns {boolean} True if event matches shortcut
 */
export function isKeyboardShortcut(event, shortcut) {
  const keyMatch = event.key === shortcut.key;
  const ctrlMatch = !shortcut.ctrlOrCmd || event.ctrlKey || event.metaKey;
  const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
  const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

  return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

/**
 * Create keyboard shortcut handler
 * @param {Array} shortcuts - Array of shortcut configs
 * @returns {Function} Handler function for keydown events
 */
export function createKeyboardHandler(shortcuts) {
  return (event) => {
    shortcuts.forEach(({ key, ctrlOrCmd = false, shiftKey = false, altKey = false, callback, preventDefault = true }) => {
      const isMatch =
        event.key === key &&
        (ctrlOrCmd ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey) &&
        (shiftKey === false || event.shiftKey === shiftKey) &&
        (altKey === false || event.altKey === altKey);

      if (isMatch) {
        if (preventDefault) event.preventDefault();
        callback(event);
      }
    });
  };
}

/**
 * Focus trap utility for modals
 * Keeps focus within modal when using Tab
 * @param {HTMLElement} containerRef - Modal container ref
 */
export function createFocusTrap(containerRef) {
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      containerRef.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  containerRef.addEventListener('keydown', handleKeyDown);

  return () => containerRef.removeEventListener('keydown', handleKeyDown);
}

/**
 * Announce text to screen readers
 * @param {string} text - Text to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(text, priority = 'polite') {
  const ariaLive = document.querySelector('[aria-live]');

  if (ariaLive) {
    ariaLive.setAttribute('aria-live', priority);
    ariaLive.textContent = text;
  } else {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = text;
    document.body.appendChild(announcer);
  }
}

/**
 * Format keyboard shortcut for display
 * @param {Object} shortcut - Shortcut definition
 * @returns {string} Formatted shortcut string
 */
export function formatKeyboardShortcut(shortcut) {
  const keys = [];

  if (shortcut.ctrlOrCmd) {
    keys.push(navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) keys.push('Alt');
  if (shortcut.shiftKey) keys.push('Shift');

  keys.push(shortcut.key);

  return keys.join('+');
}

/**
 * Check if an element is focusable
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is focusable
 */
export function isFocusable(element) {
  const focusableElements = [
    'A',
    'BUTTON',
    'INPUT',
    'SELECT',
    'TEXTAREA',
    'IFRAME',
  ];

  const isFocusableElement = focusableElements.includes(element.tagName) || element.hasAttribute('tabindex');
  const isNotDisabled = !element.hasAttribute('disabled');
  const isVisible = element.offsetParent !== null;

  return isFocusableElement && isNotDisabled && isVisible;
}

/**
 * Get all focusable elements in a container
 * @param {HTMLElement} container - Container element
 * @returns {Array} Array of focusable elements
 */
export function getFocusableElements(container) {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter(isFocusable);
}

/**
 * Move focus to first element in container
 * @param {HTMLElement} container - Container element
 */
export function focusFirstElement(container) {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[0].focus();
  }
}

/**
 * Move focus to last element in container
 * @param {HTMLElement} container - Container element
 */
export function focusLastElement(container) {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[elements.length - 1].focus();
  }
}
