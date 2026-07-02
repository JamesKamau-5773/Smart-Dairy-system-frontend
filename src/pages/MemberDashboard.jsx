import { Link } from 'react-router-dom';
import { Activity, Milk, ShieldCheck } from 'lucide-react';

export default function MemberDashboard() {
  return (
    <div className="rounded-2xl border border-[#215057]/15 bg-[linear-gradient(130deg,#f5fffd_0%,#f4fbff_55%,#fefbf2_100%)] p-6 shadow-[0_16px_32px_rgba(33,80,87,0.10)]">
      <header className="mb-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#2d7d84]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#235f64]">
          <Milk size={14} /> Member Workspace
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#17373b]">Farmer Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#355c61]">
          Focused workspace for daily member operations. Administrative controls stay hidden to maintain a clean and role-safe workflow.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">Yield Tracking</h2>
          <p className="mt-2 text-sm text-[#355c61]">Log and inspect milk production trends without finance or HR controls.</p>
          <Link to="/operations/yield" className="mt-4 inline-flex text-sm font-semibold text-[#235f64] underline underline-offset-4">Open production log</Link>
        </article>

        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">Task Flow</h2>
          <p className="mt-2 text-sm text-[#355c61]">Review assigned routines and complete field tasks quickly.</p>
          <Link to="/tasks" className="mt-4 inline-flex items-center text-sm font-semibold text-[#235f64] underline underline-offset-4">
            <Activity size={14} className="mr-1" /> Open tasks
          </Link>
        </article>

        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">Safety</h2>
          <p className="mt-2 text-sm text-[#355c61]">Keep herd safeguards visible from one member-safe view.</p>
          <Link to="/operations/safety" className="mt-4 inline-flex items-center text-sm font-semibold text-[#235f64] underline underline-offset-4">
            <ShieldCheck size={14} className="mr-1" /> Safety dashboard
          </Link>
        </article>
      </div>
    </div>
  );
}
