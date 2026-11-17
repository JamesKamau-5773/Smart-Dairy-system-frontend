import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { commonCopy } from '../../i18n/common';

const TONES = {
  default: 'text-ink',
  danger: 'text-danger-900',
};

/**
 * ⋮ menu. `items`: [{ key, label, onSelect, tone?: 'danger', disabled? }] (text only); falsy
 * entries are skipped, and nothing renders when no item is left.
 * `size` sets the trigger's tap target (44px on phones by default).
 */
export default function OverflowMenu({ label = commonCopy.controls.moreActions, items, size = 'h-11 w-11 sm:h-8 sm:w-8', align = 'end', bordered = false }) {
  const [open, setOpen] = useState(false);
  const visible = (items ?? []).filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`inline-flex ${size} shrink-0 items-center justify-center !rounded-input text-ink-muted hover:bg-ink-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${bordered ? 'border border-ink/10' : ''}`}
        >
          <MoreVertical size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={4} className="w-52 rounded-input border-ink/10 bg-card p-1">
        <div role="menu" aria-label={label}>
          {visible.map(({ key, label: itemLabel, onSelect, tone = 'default', disabled }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={`flex min-h-11 w-full items-center !rounded-badge px-3 text-left text-control hover:bg-ink-50 disabled:opacity-50 sm:min-h-9 ${TONES[tone] ?? TONES.default}`}
            >
              <span className="min-w-0 truncate">{itemLabel}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
