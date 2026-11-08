import { Check, Circle } from 'lucide-react';
import { authCopy } from '../../i18n/auth.en';
import { LOCAL_PASSWORD_RULES, getPasswordStrength, getPasswordViolations } from '../../lib/passwordStrength';

const { password: copy } = authCopy;

const BAR_STYLES = {
  empty: { filled: 0, className: 'bg-ink/10' },
  // Strength is the strength of the app's blue, with the label in words.
  weak: { filled: 1, className: 'bg-brand-200' },
  fair: { filled: 2, className: 'bg-brand-400' },
  strong: { filled: 3, className: 'bg-brand-dark' },
};

/**
 * Live checklist for a new password. Rules the server rejected (for example
 * `not_common`, which only the server can check) are passed in as
 * `serverViolations` and shown as unmet.
 */
export default function PasswordStrength({ password, personal, serverViolations = [] }) {
  const strength = getPasswordStrength(password, personal);
  const violations = new Set([...getPasswordViolations(password, personal), ...serverViolations]);
  const rules = [...LOCAL_PASSWORD_RULES, ...serverViolations.filter((rule) => !LOCAL_PASSWORD_RULES.includes(rule) && copy.rules[rule])];
  const bar = BAR_STYLES[strength];

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className={`h-1.5 flex-1 rounded-full ${index < bar.filled ? bar.className : 'bg-ink/10'}`} />
          ))}
        </div>
        {/* Announced as it changes, without moving focus. */}
        <span role="status" aria-live="polite" className="min-w-12 text-right text-xs font-semibold text-ink-muted">
          {copy.strength[strength] && <><span className="sr-only">{copy.strengthLabel}: </span>{copy.strength[strength]}</>}
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {rules.map((rule) => {
          const met = password.length > 0 && !violations.has(rule);
          return (
            <li key={rule} className={`flex items-center gap-2 ${met ? 'text-brand' : 'text-ink-muted'}`}>
              {met ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
              <span>{copy.rules[rule]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
