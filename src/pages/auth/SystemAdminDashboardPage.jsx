import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Users, ArrowRight, LayoutDashboard } from 'lucide-react';

const controlCards = [
  {
    title: 'Cooperative Setup',
    description: 'Provision cooperatives and control the first ownership invite.',
    to: '/system-admin/cooperatives',
    icon: Users,
  },
  {
    title: 'Operational Dashboard',
    description: 'Jump into the farm command center when you need live production data.',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Security Profile',
    description: 'Review platform access, bootstrap controls, and system scope.',
    to: '/system-admin/dashboard',
    icon: ShieldCheck,
  },
];

export default function SystemAdminDashboardPage() {
  return (
    <div className="animate-reveal space-y-8 max-w-7xl mx-auto">
      <header className="rounded-[28px] border border-brand/15 bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(255,255,255,0.96))] p-6 sm:p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
          <Building2 size={12} /> System Admin
        </div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-brand">System Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              This workspace is reserved for the platform owner. Use it to manage cooperatives, review platform access, and move into farm operations when needed.
            </p>
          </div>
          <Link to="/system-admin/cooperatives" className="btn-command inline-flex items-center gap-2 self-start md:self-auto">
            Open Cooperative Setup <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {controlCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.to}
              className="card-machined group rounded-[24px] border border-ink/10 bg-surface p-6 shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                    <Icon size={12} /> Control
                  </div>
                  <h2 className="mt-4 text-xl font-black tracking-tight text-ink-strong">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{card.description}</p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-white p-3 text-brand transition-transform group-hover:scale-105">
                  <Icon size={22} />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-machined rounded-[24px] border border-ink/10 bg-surface p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-muted">Role Notes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-muted">
            <li>SUPER_ADMIN is a top-level platform role and should not be mapped to cooperative admin flows.</li>
            <li>Login should use username and password only.</li>
            <li>Bootstrap keys belong only in backend-controlled registration/bootstrap paths.</li>
          </ul>
        </div>

        <div className="card-machined rounded-[24px] border border-ink/10 bg-surface p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-muted">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/system-admin/cooperatives" className="btn-command inline-flex items-center gap-2">
              Manage Cooperatives <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-2">
              Open Operations Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}