import { createContext, useContext } from 'react';

// How a Toolbar lays out its filter controls, shared with the controls inside it:
//   'row'     one wrapping row, labels for screen readers only (desktop)
//   'stacked' a two-column grid with a visible label over each control (phones and tablets):
//             search, date and pill controls take the full width, selects one column each.
export const ToolbarLayoutContext = createContext('row');

export const useToolbarLayout = () => useContext(ToolbarLayoutContext);

/** Classes for a control's wrapper and label in the current layout. */
export const toolbarSlot = (layout, { wide = false } = {}) => (layout === 'stacked'
  ? { wrapper: `block min-w-0 ${wide ? 'col-span-2' : ''}`, label: 'mb-1 block text-field-label text-ink-muted', full: 'w-full' }
  : { wrapper: '', label: 'sr-only', full: '' });
