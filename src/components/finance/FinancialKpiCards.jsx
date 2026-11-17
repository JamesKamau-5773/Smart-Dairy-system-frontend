import React from 'react';

const KpiCard = ({ title, value, subtext, children, valueClassName = 'text-ink' }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 ">
    <span className="text-label text-slate-400">{title}</span>
    {value && <div className={`text-body-strong mt-2 ${valueClassName}`}>{value}</div>}
    {children}
    {subtext && <p className="text-meta text-slate-400 mt-2">{subtext}</p>}
  </div>
);

const FinancialKpiCards = ({ kpis, totalProfit, isCoopMember }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KpiCard
        title="Total Profit"
        value={`KES ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        subtext="// Profit this season"
      />
      <KpiCard
        title="Total Costs"
        value={`KES ${kpis.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        valueClassName="text-danger"
        subtext="// Money spent this season"
      />
      {isCoopMember ? (
        <KpiCard title="Payout Breakdown" subtext="// 25% saved for you.">
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-meta text-ink">Cash in hand</span>
              <span className="text-meta text-brand">75%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
              <div className="h-full bg-brand w-[75%]"></div>
              <div className="h-full bg-slate-300 w-[25%]"></div>
            </div>
          </div>
        </KpiCard>
      ) : (
        <KpiCard
          title="Total Income"
          value={`KES ${kpis.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueClassName="text-brand"
          subtext="// Total from all sales"
        />
      )}
      <KpiCard title="Tax Status" subtext="// Linked to: Bahati_01">
        <div className="mt-4 text-meta text-ink">eTIMS sync active</div>
      </KpiCard>
    </div>
  );
};

export default FinancialKpiCards;