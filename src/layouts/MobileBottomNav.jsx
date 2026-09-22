import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultLandingPath } from '../lib/roles';

void React;

export default function MobileBottomNav() {
  const { currentUser } = useAuth();
  const homePath = getDefaultLandingPath(currentUser);

  const canViewTasks = true;
  const taskLabel = 'Farm Task View';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        <NavLink
          to={homePath}
          className={({ isActive }) =>
            `min-h-[56px] rounded-xl border px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
              isActive
                ? 'border-brand-400 bg-ink-900 text-white'
                : 'border-slate-200 bg-white/90 text-slate-600'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {canViewTasks ? (
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `min-h-[56px] rounded-xl border px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-brand-400 bg-ink-900 text-white'
                  : 'border-slate-200 bg-white/90 text-slate-600'
              }`
            }
          >
            <Activity size={18} />
            <span>{taskLabel}</span>
          </NavLink>
        ) : (
          <div className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600">
            <Activity size={18} />
            <span>{taskLabel}</span>
          </div>
        )}
      </div>
    </nav>
  );
}