import React from 'react';

export default function DashboardCard({ children, className = '', dark = false, flexCol = false }) {
  const baseStyle = dark
    ? 'bg-slate-900 border-slate-800 shadow-xl text-white'
    : 'bg-surface border-ink/5 shadow-sm text-ink';

  const layoutStyle = flexCol ? 'flex flex-col h-full justify-between' : '';

  return (
    <div className={`rounded-2xl border p-6 sm:p-7 ${baseStyle} ${layoutStyle} ${className}`.trim()}>
      {children}
    </div>
  );
}