import { Link } from 'react-router-dom';
import { adminCopy } from '../../i18n/admin';

const copy = adminCopy.system;
const controlCards = [
  {
    key: 'coopSetup',
    get title() { return copy.cards.coopSetup.title; },
    get description() { return copy.cards.coopSetup.description; },
    to: '/system-admin/cooperatives',
  },
  {
    key: 'operations',
    get title() { return copy.cards.operations.title; },
    get description() { return copy.cards.operations.description; },
    to: '/dashboard',
  },
  {
    key: 'security',
    get title() { return copy.cards.security.title; },
    get description() { return copy.cards.security.description; },
    to: '/system-admin/dashboard',
  },
];

export default function SystemAdminDashboardPage() {
  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      <header className="rounded-[28px] border border-brand/15 bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(255,255,255,0.96))] p-6 sm:p-8 ">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-page-title text-brand">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-body text-ink-muted">
              {copy.subtitle}
            </p>
          </div>
          <Link to="/system-admin/cooperatives" className="btn-command inline-flex items-center gap-2 self-start md:self-auto">

            {copy.openCoopSetup}
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {controlCards.map((card) => {
          return (
            <Link
              key={card.key}
              to={card.to}
              className="card-machined group rounded-[24px] border border-ink/10 bg-surface p-6  transition-transform hover:-translate-y-1"
            >
              <div className="inline-flex items-center rounded-full bg-brand/5 px-3 py-1 text-label text-brand">
                    {copy.control}
              </div>
              <h2 className="mt-4 text-section-title text-ink-strong">{card.title}</h2>
              <p className="mt-2 text-body text-ink-muted">{card.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-machined rounded-[24px] border border-ink/10 bg-surface p-6">
          <h2 className="text-section-title text-ink-muted">{copy.roleNotes}</h2>
          <ul className="mt-4 space-y-3 text-body text-ink-muted">
            {copy.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>

        <div className="card-machined rounded-[24px] border border-ink/10 bg-surface p-6">
          <h2 className="text-section-title text-ink-muted">{copy.quickActions}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/system-admin/cooperatives" className="btn-command inline-flex items-center gap-2">

              {copy.manageCoops}
            </Link>
            <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-2">
              {copy.openOperations}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}