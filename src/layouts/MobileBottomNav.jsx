import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPrimaryAdmin, hasRole } from '../lib/permissions';

void React;

export default function MobileBottomNav() {
  const { currentUser } = useAuth();

  const canViewTasks = isPrimaryAdmin(currentUser) || hasRole(currentUser, 'FARMER') || hasRole(currentUser, 'Herdsman');
  const taskLabel = hasRole(currentUser, 'Herdsman') ? 'My Tasks' : 'Herdsman View';

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-surface/95 backdrop-blur-md shadow-[0_-10px_30px_rgba(15,23,42,0.08)]"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `min-h-[56px] rounded-xl border px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-brand text-surface border-brand/20 shadow-[0_10px_20px_rgba(2,132,199,0.18)]'
                : 'bg-surface text-ink border-ink/10'
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
                  ? 'bg-brand text-surface border-brand/20 shadow-[0_10px_20px_rgba(2,132,199,0.18)]'
                  : 'bg-surface text-ink border-ink/10'
              }`
            }
          >
            <Activity size={18} />
            <span>{taskLabel}</span>
          </NavLink>
        ) : (
          <div className="min-h-[56px] rounded-xl border border-ink/10 bg-surface px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-ink/40">
            <Activity size={18} />
            <span>{taskLabel}</span>
          </div>
        )}
      </div>
    </nav>
  );
}