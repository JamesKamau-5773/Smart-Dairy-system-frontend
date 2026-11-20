import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { tone } from './tones';

// Same tones as AlertBanner (./tones), for a note inside a card where a full
// banner would compete with the card itself.
const ICONS = {
  info: { Icon: Info, tone: 'info' },
  warning: { Icon: AlertTriangle, tone: 'attention' },
  danger: { Icon: XCircle, tone: 'critical' },
};

/** A titled one-line note inside a card: tinted icon, ink text, no box. */
export default function InlineNotice({ tone: kind = 'info', title, children }) {
  const { Icon, tone: toneName } = ICONS[kind] ?? ICONS.info;
  const { icon } = tone(toneName);
  return (
    <div className="flex items-start gap-2.5 border-t border-ink/10 pt-3" role={kind === 'info' ? 'status' : 'note'}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${icon}`} aria-hidden="true" />
      <div className="min-w-0 text-body">
        {title && <p className="text-body-strong text-ink">{title}</p>}
        <p className={title ? 'text-ink-muted' : 'text-ink'}>{children}</p>
      </div>
    </div>
  );
}
