import { WifiOff } from 'lucide-react';
import { authCopy } from '../../i18n/auth';
import LanguageSwitch from '../ui/LanguageSwitch';
import BrandLogo from '../brand/BrandLogo';
import { shellCopy } from '../../i18n/shell';

const { layout: copy } = authCopy;

/**
 * Shared frame for the login and registration pages: logo back to the public
 * landing page, the form card, and (on large screens) the farm photo panel.
 */
export default function AuthLayout({ headerAction, offline = false, children }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Blurred farm photo behind the page; the warm overlay keeps the form easy to read. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <img src="/images/calf.jpg" alt="" decoding="async" className="h-full w-full scale-105 object-cover object-[70%_45%] blur-sm" />
        <div className="absolute inset-0 bg-[#F9F8F6]/55" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          {headerAction}
        </div>
      </header>

      {/* One centred card: the form, plus a brand panel beside it on large screens. */}
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 pb-12 pt-2 lg:justify-center lg:pb-16">
        {offline && (
          <p role="status" className="mx-auto mb-4 flex w-full max-w-md items-start gap-3 rounded-card border border-brand/40 bg-brand-50 p-4 text-body text-ink-900 lg:max-w-none">
            <WifiOff size={18} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true" />
            <span>{copy.offline}</span>
          </p>
        )}

        {/* The endorsed logo centred above the form, with at least 24px clear around it. A plain
            link: "/" is the static landing page, outside the SPA router. */}
        <a href="/" aria-label={shellCopy.brand.home} className="mx-auto mb-6 inline-flex rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <BrandLogo variant="stacked-endorsed" size={220} decorative className="w-[180px] sm:w-[220px]" />
        </a>

        <div className="card-machined mx-auto grid w-full max-w-md lg:max-w-none lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="p-6 sm:p-8 lg:p-10">{children}</div>

          <aside className="hidden flex-col justify-center bg-brand p-10 text-white lg:flex" aria-label={copy.benefitsLabel}>
            <p className="text-stat-value text-white">
              {copy.tagline[0]}<br />{copy.tagline[1]}<br /><span className="text-brand-200">{copy.tagline[2]}</span>
            </p>
            <ul className="mt-8 space-y-4 text-body-strong text-brand-50">
              {copy.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
