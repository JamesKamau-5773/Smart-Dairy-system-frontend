import { Link } from 'react-router-dom';
import { dashboardCopy } from '../i18n/dashboard';

export default function MemberDashboard() {
  const copy = dashboardCopy.member;
  return (
    <div className="rounded-2xl border border-[#215057]/15 bg-[linear-gradient(130deg,#f5fffd_0%,#f4fbff_55%,#fefbf2_100%)] p-6 ">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#17373b]">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#355c61]">
          {copy.subtitle}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">{copy.yieldTitle}</h2>
          <p className="mt-2 text-sm text-[#355c61]">{copy.yieldText}</p>
          <Link to="/operations/yield" className="mt-4 inline-flex text-sm font-semibold text-[#235f64] underline underline-offset-4">{copy.yieldLink}</Link>
        </article>

        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">{copy.tasksTitle}</h2>
          <p className="mt-2 text-sm text-[#355c61]">{copy.tasksText}</p>
          <Link to="/tasks" className="mt-4 inline-flex items-center text-sm font-semibold text-[#235f64] underline underline-offset-4">

            {copy.tasksLink}
          </Link>
        </article>

        <article className="rounded-xl border border-[#2d7d84]/20 bg-white/80 p-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#2a5c61]">{copy.safetyTitle}</h2>
          <p className="mt-2 text-sm text-[#355c61]">{copy.safetyText}</p>
          <Link to="/operations/safety" className="mt-4 inline-flex items-center text-sm font-semibold text-[#235f64] underline underline-offset-4">

            {copy.safetyLink}
          </Link>
        </article>
      </div>
    </div>
  );
}
