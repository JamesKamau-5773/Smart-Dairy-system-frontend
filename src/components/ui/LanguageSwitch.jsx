import { canSwitchLocale, LOCALES } from '../../i18n/locale';
import { useLocale } from '../../i18n/useLocale';

// Short codes keep the switch small enough for the sign-in header at 360px.
const SHORT = { en: 'EN', sw: 'SW' };

/**
 * English / Kiswahili switch. The choice is remembered on this device and applies everywhere,
 * including the sign-in screens. The group label is in both languages so either reader finds it.
 * Hidden when the `kiswahili` feature flag is off.
 *
 * @param {object} props
 * @param {boolean} [props.full] Show the full language names (e.g. in the profile menu).
 */
export default function LanguageSwitch({ full = false }) {
  const { locale, setLocale } = useLocale();
  if (!canSwitchLocale()) return null;

  return (
    <div role="group" aria-label="Language / Lugha" className="inline-flex shrink-0 rounded-button border border-ink/15 bg-surface p-0.5">
      {Object.entries(LOCALES).map(([code, { name }]) => (
        <button
          key={code}
          type="button"
          lang={LOCALES[code].htmlLang}
          aria-pressed={locale === code}
          aria-label={full ? undefined : name}
          onClick={() => setLocale(code)}
          className={`min-h-9 min-w-10 rounded-md px-2.5 text-control transition-colors ${
            locale === code ? 'bg-brand text-white' : 'text-ink-muted hover:bg-brand-50 hover:text-ink'
          } ${full ? 'flex-1' : ''}`}
        >
          {full ? name : SHORT[code]}
        </button>
      ))}
    </div>
  );
}
