import { Plus } from 'lucide-react';
import OverflowMenu from '../ui/OverflowMenu';
import { commonCopy } from '../../i18n/common';

// Only the page's one primary create action carries an icon (a "+"); every other button is text.
const ActionButton = ({ action, variant, className = '' }) => (
  <button
    type="button"
    onClick={action.onClick}
    className={`${variant === 'primary' ? 'btn-command' : 'btn-secondary'} min-h-11 gap-2 px-4 ${className}`}
  >
    {variant === 'primary' && action.create && <Plus size={16} aria-hidden="true" />}
    {action.label}
  </button>
);

/**
 * One row: the page's one <h1> (matching the sidebar and top bar), an optional one-line muted
 * description, and right-aligned actions. No panel, tint or icon tile.
 *
 * primaryAction: { label, onClick, create? } (create: true shows the "+" for the page's create action)
 * secondaryActions: [{ key, label, onClick }]
 * secondaryOnMobile: 'menu' moves secondary actions into ⋮ below md; 'inline' keeps them.
 */
export default function PageHeader({ title, description, primaryAction, secondaryActions = [], secondaryOnMobile = 'menu' }) {
  const collapse = secondaryOnMobile === 'menu' && secondaryActions.length > 0;
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="m-0 truncate text-page-title text-ink">{title}</h1>
        {description && <p className="mt-0.5 truncate text-body text-ink-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {secondaryActions.map((action) => (
          <ActionButton key={action.key} action={action} variant="secondary" className={collapse ? 'hidden md:inline-flex' : ''} />
        ))}
        {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
        {collapse && (
          <div className="md:hidden">
            <OverflowMenu
              label={commonCopy.ui.moreActions}
              size="h-11 w-11"
              bordered
              items={secondaryActions.map((action) => ({ key: action.key, label: action.label, onSelect: action.onClick }))}
            />
          </div>
        )}
      </div>
    </header>
  );
}
