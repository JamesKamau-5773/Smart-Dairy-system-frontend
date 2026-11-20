import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { commonCopy } from '../../i18n/common';

/**
 * An ⓘ button that explains a figure or a line. Opens on tap or click (a hover-only tooltip
 * can't be reached on a phone) and closes with Escape or a tap elsewhere.
 *
 * topic:     what it explains, for the button's name ("About Total Sales")
 * children:  the explanation
 * className: the icon colour, to suit the surface it sits on (default muted ink)
 */
export default function InfoTip({ topic, children, className = 'text-ink-muted hover:text-ink' }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={commonCopy.controls.about(topic)}
          className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle normal-case before:absolute before:-inset-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
        >
          <Info size={14} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" collisionPadding={16} className="w-[min(18rem,calc(100vw-2rem))] rounded-input border-ink/10 bg-card p-3 text-body normal-case text-ink">
        {children}
      </PopoverContent>
    </Popover>
  );
}
