import OverflowMenu from '../ui/OverflowMenu';
import { commonCopy } from '../../i18n/common';

const ActionButton = ({ action, variant, className = '' }) => {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`${variant === 'primary' ? 'btn-command' : 'btn-secondary'} min-h-11 gap-2 px-4 text-sm ${className}`}
    >
      {Icon && <Icon size={16} aria-hidden="true" />} {action.label}
    </button>
  );
};

/**
 * One row: page title (matching the sidebar and top bar), an optional one-line muted
 * description, and right-aligned actions. No panel, tint or icon tile.
 *
 * primaryAction: { label, icon?, onClick }
 * secondaryActions: [{ key, label, icon?, onClick }]
 * secondaryOnMobile: 'menu' moves secondary actions into ⋮ below md; 'inline' keeps them.
 */
export default function PageHeader({ title, description, primaryAction, secondaryActions = [], secondaryOnMobile = 'menu' }) {
  const collapse = secondaryOnMobile === 'menu' && secondaryActions.length > 0;
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h2 className="m-0 truncate font-sans text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 truncate text-sm text-ink-muted">{description}</p>}
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
              items={secondaryActions.map((action) => ({ key: action.key, label: action.label, icon: action.icon, onSelect: action.onClick }))}
            />
          </div>
        )}
      </div>
    </header>
  );
}
