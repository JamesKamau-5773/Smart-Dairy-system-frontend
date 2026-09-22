export default function DashboardCard({ children, className = '', dark = false, flexCol = false }) {
  const baseStyle = dark
    ? 'border-slate-800 bg-ink-900 text-white'
    : 'border-slate-200 border-t-[3px] border-t-brand-400 bg-white/90 text-ink-900 backdrop-blur';

  const layoutStyle = flexCol ? 'flex flex-col h-full justify-between' : '';

  return (
    <div className={`rounded-card border p-4 ${baseStyle} ${layoutStyle} ${className}`.trim()}>
      {children}
    </div>
  );
}