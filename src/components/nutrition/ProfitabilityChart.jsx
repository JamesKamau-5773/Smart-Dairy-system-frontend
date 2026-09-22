import { TrendingDown } from 'lucide-react';

export default function ProfitabilityChart({ trends }) {
  if (!Array.isArray(trends) || trends.length === 0) {
    return (
      <div className="flex flex-col border border-slate-300 bg-white p-6">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <TrendingDown size={16} /> Feed Cost Per Liter of Milk
        </h3>
        <p className="text-xs font-medium text-slate-600">
          No profitability trend data is available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-slate-300 bg-white p-6">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <TrendingDown size={16} /> Feed Cost Per Liter of Milk
      </h3>
      <p className="mb-8 border-b border-slate-300 pb-4 text-xs font-medium text-slate-600">
        How much of your milk money goes to buying feed. Lower numbers mean you keep more profit.
      </p>

      <div className="flex-1 flex items-end justify-between gap-2 mt-auto pt-4 min-h-[160px]">
        {trends.map((data, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group">
            <span className={`mb-2 font-mono text-[10px] font-bold tabular-nums tracking-tight transition-colors ${data.isCurrent ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
              KES {data.cost.toFixed(2)}
            </span>
            <div className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${data.isCurrent ? 'bg-brand' : 'bg-brand/15 group-hover:bg-brand/30'} ${data.height}`} />
            <span className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${data.isCurrent ? 'text-slate-900' : 'text-slate-600'}`}>
              {data.week}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}