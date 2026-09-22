import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CircleDollarSign, Milk, RefreshCw, Sprout, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { herdApi, reportsApi } from '../../lib/backendApi';
import MetricLabel from '../../components/finance/MetricLabel';
import Money from '../../components/ui/Money';
import { useTenant } from '../../hooks/useTenant';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { cn } from '../../lib/utils';

function getValueTone(value, { cost = false } = {}) {
  const amount = Number(value ?? 0);
  if (amount === 0) return 'text-amber-800';
  if (cost) return 'text-slate-900';
  return amount > 0 ? 'text-emerald-700' : 'text-red-700';
}

function toReadableLabel(value) {
  return value ? String(value).replaceAll('_', ' ') : 'Not recorded';
}

const Metric = ({ label, explanation, amount, icon: Icon, cost = false }) => (
  <div className="card-machined flex flex-col justify-between border border-slate-300 bg-white p-5 ">
    <div className="mb-2 flex items-start justify-between gap-3 text-slate-700">
      <span className="text-xs font-bold uppercase tracking-wider">
        <MetricLabel explanation={explanation}>{label}</MetricLabel>
      </span>
      <Icon size={16} className="shrink-0 text-slate-900" />
    </div>
    <div className={cn('text-2xl font-black font-mono tabular-nums', getValueTone(amount, { cost }))}>
      <Money amount={amount} className="!font-mono" />
    </div>
  </div>
);

function AnimalSummary({ animal, netContribution }) {
  if (!animal) {
    return (
      <section aria-label="Animal summary" className="border-l-4 border-cyan-400 bg-slate-900 px-4 py-4 text-white sm:px-5">
        <p className="text-xs font-bold uppercase text-cyan-300">Animal summary</p>
        <p className="mt-1 text-base font-bold sm:text-lg">Choose an animal to see its costs and profit.</p>
      </section>
    );
  }

  const amount = Number(netContribution ?? 0);
  const animalName = formatCowIdentity(animal);
  const summary = amount > 0
    ? <>{animalName} has produced <Money amount={amount} className="!font-mono" /> in profit after recorded costs.</>
    : amount < 0
      ? <>{animalName} is <Money amount={Math.abs(amount)} className="!font-mono" /> below recorded costs.</>
      : <>{animalName} has not yet produced profit above recorded costs.</>;

  return (
    <section
      aria-label="Animal summary"
      className={cn(
        'flex flex-col gap-3 border-l-4 bg-slate-900 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5',
        amount > 0 ? 'border-emerald-500' : amount < 0 ? 'border-red-500' : 'border-amber-400'
      )}
    >
      <div>
        <p className="text-xs font-bold uppercase text-cyan-300">Animal summary</p>
        <p className="mt-1 text-base font-bold sm:text-lg">{summary}</p>
      </div>
      <p className="text-sm font-medium text-slate-200">Review the breakdown below to see where costs and income came from.</p>
    </section>
  );
}

export default function AnimalEconomicsReport() {
  const { tenantId, farmId } = useTenant();
  const [animalId, setAnimalId] = React.useState('');
  const { data: animals = [] } = useQuery({ queryKey: ['herd', tenantId, farmId], queryFn: () => herdApi.list(), enabled: !!tenantId && !!farmId });
  const report = useQuery({ queryKey: ['animal-economics', tenantId, farmId, animalId], queryFn: () => reportsApi.getAnimalEconomics(animalId), enabled: !!tenantId && !!farmId && !!animalId });
  const data = report.data;
  const isMissingData = data?.data_quality?.attribution_quality?.toUpperCase() === 'INCOMPLETE'
    || data?.data_quality?.first_calving_recorded === false
    || (data && !data.animal?.first_calving_date);

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-6">
      <div className="border-b border-slate-300 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          <Activity size={12} /> Cow Profitability
        </div>
        <h1 className="mt-3 font-sans text-3xl font-black tracking-tight text-slate-900">Cost to Raise vs. Total Earnings</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-700">
          See what each animal has cost to raise and how much income it has generated from milk.
        </p>
      </div>

      <div className="card-machined border border-slate-300 bg-white p-5 ">
        <label className="block max-w-md">
          <span className="mb-1 block text-[10px] font-bold uppercase text-slate-700">Select animal</span>
          <select value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="input-machined w-full">
            <option value="">Choose an animal</option>
            {animals.map((animal) => <option key={animal.id} value={animal.id}>{formatCowIdentity(animal)}</option>)}
          </select>
        </label>
      </div>

      {!animalId && <AnimalSummary />}

      {report.isLoading && (
        <div className="card-machined animate-pulse border border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-700">Calculating cow profitability...</div>
      )}
      {report.isError && (
        <div className="card-machined border-2 border-red-900 bg-red-700 p-6 text-white">
          <p className="font-bold">Unable to load cow profitability.</p>
          <button onClick={() => report.refetch()} className="mt-2 flex items-center gap-1 text-xs font-semibold text-white underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <AnimalSummary animal={data.animal} netContribution={data.lifetime_net_contribution_kes} />

          <div className="flex flex-col gap-2 border-y border-slate-300 py-3 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <strong className="text-slate-900">{formatCowIdentity(data.animal)}</strong>
            <span>First calving: <span className="font-medium text-slate-900">{data.animal.first_calving_date || 'Not recorded'}</span></span>
            <span>Record Status: <span className={cn('font-bold', isMissingData ? 'text-red-700' : 'text-emerald-700')}>{isMissingData ? 'Missing Data' : 'Complete'}</span></span>
          </div>

          {isMissingData && (
            <Link
              to={`/operations/animal/${encodeURIComponent(animalId)}?action=calving`}
              className="flex items-start gap-3 border-2 border-red-700 bg-white p-4 text-sm font-bold text-red-700  transition-colors hover:bg-red-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <span>Missing first calving date. Click here to add it to calculate exact costs.</span>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric
              label="Cost to Raise (Before Calving)"
              explanation="All recorded feed, health, breeding, and other direct costs before the animal's first calving."
              amount={data.rearing_cost.amount_kes}
              icon={Sprout}
              cost
            />
            <Metric
              label="Total Milk Income"
              explanation="Milk income credited to this animal minus its recorded costs after first calving."
              amount={data.lifetime_milk_contribution.amount_kes}
              icon={Milk}
            />
            <Metric
              label="Total Profit (Income minus Costs)"
              explanation="The animal's milk profit after subtracting all recorded raising costs."
              amount={data.lifetime_net_contribution_kes}
              icon={CircleDollarSign}
            />
          </div>

          <div className="card-machined grid grid-cols-1 gap-5 border border-slate-300 bg-white p-5 text-sm  sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-slate-700">Total Milk Sold</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums tracking-tight text-slate-900">{data.lifetime_milk_contribution.saleable_milk_liters} L</p>
            </div>
            <div>
              <p className="text-slate-700">Estimated Milk Revenue</p>
              <p className={cn('mt-1 text-lg font-bold', getValueTone(data.lifetime_milk_contribution.allocated_milk_revenue_kes))}>
                <Money amount={data.lifetime_milk_contribution.allocated_milk_revenue_kes} className="!font-mono" />
              </p>
            </div>
            <div>
              <p className="text-slate-700">Care &amp; Feed Costs (After Calving)</p>
              <p className={cn('mt-1 text-lg font-bold', getValueTone(data.lifetime_milk_contribution.post_calving_cost_kes, { cost: true }))}>
                <Money amount={data.lifetime_milk_contribution.post_calving_cost_kes} className="!font-mono" />
              </p>
            </div>
            <div>
              <p className="text-slate-700">Milk Sold (Awaiting Price)</p>
              <p className={cn(
                'mt-1 font-mono text-lg font-bold tabular-nums tracking-tight',
                Number(data.data_quality.unpriced_saleable_liters ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'
              )}>
                {data.data_quality.unpriced_saleable_liters} L
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="card-machined space-y-4 border border-slate-300 bg-white p-6 ">
              <h2 className="flex items-center gap-2 border-b border-slate-300 pb-3 text-lg font-bold text-slate-900">
                <Wallet size={18} className="text-slate-900" /> Expense Breakdown
              </h2>
              {Object.keys(data.costs_by_type_kes || {}).length === 0 ? (
                <p className="text-sm font-bold text-red-700">No direct animal costs have been recorded.</p>
              ) : (
                <dl className="divide-y divide-slate-300 text-sm">
                  {Object.entries(data.costs_by_type_kes).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="capitalize text-slate-700">{type.replaceAll('_', ' ')}</dt>
                      <dd className="font-bold text-slate-900"><Money amount={amount} className="!font-mono" /></dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section className="card-machined space-y-4 border border-slate-300 bg-white p-6 ">
              <h2 className="border-b border-slate-300 pb-3 text-lg font-bold text-slate-900">Record Completeness</h2>
              <dl className="divide-y divide-slate-300 text-sm">
                <div className="py-2.5">
                  <dt className="text-slate-700">How costs were matched</dt>
                  <dd className="mt-1 font-bold capitalize text-slate-900">{toReadableLabel(data.data_quality.cost_attribution)}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-slate-700">How milk income was matched</dt>
                  <dd className="mt-1 font-bold capitalize text-slate-900">{toReadableLabel(data.data_quality.milk_revenue_attribution)}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-slate-700">First calving date</dt>
                  <dd className={cn('mt-1 font-bold', data.data_quality.first_calving_recorded ? 'text-emerald-700' : 'text-red-700')}>
                    {data.data_quality.first_calving_recorded ? 'Recorded' : 'Not recorded'}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
