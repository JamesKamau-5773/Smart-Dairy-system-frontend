import { Check, WifiOff } from 'lucide-react';

const BENEFITS = [
  'Record milk per cow in seconds',
  'Never miss a heat or a payment',
  'Keeps working without network',
];

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

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        {/* Plain link: "/" is the static landing page, outside the SPA router. */}
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand">
          <img src="/logo.png" alt="" width="32" height="32" className="size-8 rounded-badge" />
          Maziwa Smart
        </a>
        {headerAction}
      </header>

      {/* One centred card: the form, plus a brand panel beside it on large screens. */}
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 pb-12 pt-2 lg:justify-center lg:pb-16">
        {offline && (
          <p role="status" className="mx-auto mb-4 flex w-full max-w-md items-start gap-3 rounded-card border border-warning/30 bg-warning/10 p-4 text-sm text-ink-900 lg:max-w-none">
            <WifiOff size={18} className="mt-0.5 shrink-0 text-warning-700" aria-hidden="true" />
            <span>You’re offline. Connect to the internet to continue. Once you’re signed in, the app keeps working without network.</span>
          </p>
        )}

        <div className="card-machined mx-auto grid w-full max-w-md lg:max-w-none lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="p-6 sm:p-8 lg:p-10">{children}</div>

          <aside className="hidden flex-col justify-center bg-brand p-10 text-white lg:flex" aria-label="Why farmers use Maziwa Smart">
            <p className="text-3xl font-bold leading-tight tracking-tight text-white">
              Every litre.<br />Every cow.<br /><span className="text-brand-200">Every shilling.</span>
            </p>
            <ul className="mt-8 space-y-4 text-lg text-brand-50">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-brand-200" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
