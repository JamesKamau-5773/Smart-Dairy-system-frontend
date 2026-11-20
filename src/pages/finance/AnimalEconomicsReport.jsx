import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { herdApi, reportsApi } from '../../lib/backendApi';
import MetricLabel from '../../components/finance/MetricLabel';
import Money from '../../components/ui/Money';
import { useTenant } from '../../hooks/useTenant';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { cn } from '../../lib/utils';
import { formatLitres } from '../../lib/numberFormat';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { ListLoadNotices } from '../../components/ui/ListLoadState';
import Skeleton from '../../components/ui/Skeleton';
import { financeCopy } from '../../i18n/finance';
import { shellCopy } from '../../i18n/shell';
import { enumLabel, humanizeEnum } from '../../lib/enumLabel';

const copy = financeCopy.cowProfit;
// A cost type code ("calf_feed") in the chosen language; an unknown one made readable.
const costTypeLabel = (type) => enumLabel(financeCopy.ledgerForm.animalCostTypes, String(type).toUpperCase());

const METRIC_CARDS = 3;
const isUnknown = (value) => value === null || value === undefined || value === '' || Number.isNaN(Number(value));

function getValueTone(value, { cost = false } = {}) {
  // An unknown figure is neutral: it isn't a zero (amber) or a loss (red).
  if (isUnknown(value)) return 'text-slate-500';
  const amount = Number(value);
  if (amount === 0) return 'text-amber-800';
  if (cost) return 'text-slate-900';
  return amount > 0 ? 'text-emerald-700' : 'text-red-700';
}

function toReadableLabel(value) {
  return value ? humanizeEnum(value) : copy.notRecorded;
}

const Metric = ({ label, explanation, amount, cost = false }) => (
  <div className="card-machined flex flex-col justify-between border border-slate-300 bg-white p-5 ">
    <div className="mb-2 text-slate-700">
      <span className="text-label">
        <MetricLabel explanation={explanation}>{label}</MetricLabel>
      </span>
    </div>
    <div className={cn('text-stat-value tabular-nums', getValueTone(amount, { cost }))}>
      <Money amount={amount} className="tabular-nums" />
    </div>
  </div>
);

function AnimalSummary({ animal, netContribution }) {
  if (!animal) {
    return (
      <section aria-label={copy.summaryLabel} className="border-l-4 border-cyan-400 bg-slate-900 px-4 py-4 text-white sm:px-5">
        <p className="text-label text-cyan-300">{copy.summaryLabel}</p>
        <p className="mt-1 text-body-strong">{copy.chooseAnimal}</p>
      </section>
    );
  }

  const animalName = formatCowIdentity(animal);
  const amount = isUnknown(netContribution) ? null : Number(netContribution);
  const summary = amount === null
    ? <>{copy.unknown(animalName)}</>
    : amount > 0
    ? <>{copy.profitBefore(animalName)}<Money amount={amount} className="tabular-nums" />{copy.profitAfter}</>
    : amount < 0
      ? <>{copy.lossBefore(animalName)}<Money amount={Math.abs(amount)} className="tabular-nums" />{copy.lossAfter}</>
      : <>{copy.none(animalName)}</>;

  return (
    <section
      aria-label={copy.summaryLabel}
      className={cn(
        'flex flex-col gap-3 border-l-4 bg-slate-900 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5',
        amount === null ? 'border-slate-500' : amount > 0 ? 'border-emerald-500' : amount < 0 ? 'border-red-500' : 'border-amber-400'
      )}
    >
      <div>
        <p className="text-label text-cyan-300">{copy.summaryLabel}</p>
        <p className="mt-1 text-body-strong">{summary}</p>
      </div>
      <p className="text-body text-slate-200">{copy.breakdownHint}</p>
    </section>
  );
}

export default function AnimalEconomicsReport() {
  const { tenantId, farmId } = useTenant();
  const [animalId, setAnimalId] = React.useState('');
  const animalsQuery = useQuery({ queryKey: ['herd', tenantId, farmId], queryFn: () => herdApi.list(), enabled: !!tenantId && !!farmId });
  const animals = animalsQuery.data ?? [];
  const animalsState = getListLoadState(animalsQuery);
  const report = useQuery({ queryKey: ['animal-economics', tenantId, farmId, animalId], queryFn: () => reportsApi.getAnimalEconomics(animalId), enabled: !!tenantId && !!farmId && !!animalId });
  const reportState = getListLoadState(report);
  const data = hasRowsToShow(reportState) ? report.data : undefined;
  const milk = data?.lifetime_milk_contribution ?? {};
  const isMissingData = data?.data_quality?.attribution_quality?.toUpperCase() === 'INCOMPLETE'
    || data?.data_quality?.first_calving_recorded === false
    || (data && !data.animal?.first_calving_date);

  return (
    <div className="animate-reveal mx-auto max-w-7xl space-y-6">
      <div className="border-b border-slate-300 pb-6">
        <h1 className="text-page-title text-slate-900">{shellCopy.nav.items.cowProfit}</h1>
        <p className="mt-2 max-w-2xl text-body text-slate-700">
          {copy.subtitle}
        </p>
      </div>

      <div className="card-machined border border-slate-300 bg-white p-5 ">
        <label className="block max-w-md">
          <span className="mb-1 block text-field-label text-ink-muted">{copy.selectAnimal}</span>
          <select value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="input-machined w-full" disabled={animalsState === 'loading'}>
            <option value="">{animalsState === 'loading' ? copy.loadingAnimals : copy.choose}</option>
            {animals.map((animal) => <option key={animal.id} value={animal.id}>{formatCowIdentity(animal)}</option>)}
          </select>
        </label>
        {animalsState !== 'ready' && animalsState !== 'loading' && (
          <div className="-mx-5 -mb-5 mt-4 border-t border-slate-200">
            <ListLoadNotices state={animalsState} label={copy.animalsLabel} error={animalsQuery.error} onRetry={animalsQuery.refetch} />
          </div>
        )}
      </div>

      {!animalId && <AnimalSummary />}

      {animalId && reportState !== 'ready' && (
        <div className="card-machined overflow-hidden border border-slate-300 bg-white !p-0">
          <ListLoadNotices state={reportState} label={copy.figuresLabel} error={report.error} onRetry={report.refetch} />
          {reportState === 'loading' && (
            <div role="status" className="space-y-4 p-5">
              <span className="sr-only">{copy.calculating}</span>
              <Skeleton className="h-14 w-full" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: METRIC_CARDS }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {data && (
        <>
          <AnimalSummary animal={data.animal} netContribution={data.lifetime_net_contribution_kes} />

          <div className="flex flex-col gap-2 border-y border-slate-300 py-3 text-body text-slate-700 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <strong className="text-slate-900">{formatCowIdentity(data.animal)}</strong>
            <span>{copy.firstCalving} <span className="text-slate-900">{data.animal?.first_calving_date || copy.notRecorded}</span></span>
            <span>{copy.recordStatus} <span className={cn('text-body-strong', isMissingData ? 'text-red-700' : 'text-emerald-700')}>{isMissingData ? copy.missingData : copy.complete}</span></span>
          </div>

          {isMissingData && (
            <Link
              to={`/operations/animal/${encodeURIComponent(animalId)}?action=calving`}
              className="flex items-start gap-3 border-2 border-red-700 bg-white p-4 text-body-strong text-red-700 transition-colors hover:bg-red-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{copy.missingCalving}</span>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric
              label={copy.rearing}
              explanation={copy.rearingHelp}
              amount={data.rearing_cost?.amount_kes}
              cost
            />
            <Metric
              label={copy.milkIncome}
              explanation={copy.milkIncomeHelp}
              amount={milk.amount_kes}
            />
            <Metric
              label={copy.profit}
              explanation={copy.profitHelp}
              amount={data.lifetime_net_contribution_kes}
            />
          </div>

          <div className="card-machined grid grid-cols-1 gap-5 border border-slate-300 bg-white p-5 text-body sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-slate-700">{copy.milkSold}</p>
              <p className="mt-1 text-body-strong tabular-nums text-slate-900">{formatLitres(milk.saleable_milk_liters)}</p>
            </div>
            <div>
              <p className="text-slate-700">{copy.revenue}</p>
              <p className={cn('mt-1 text-body-strong', getValueTone(milk.allocated_milk_revenue_kes))}>
                <Money amount={milk.allocated_milk_revenue_kes} className="tabular-nums" />
              </p>
            </div>
            <div>
              <p className="text-slate-700">{copy.careCosts}</p>
              <p className={cn('mt-1 text-body-strong', getValueTone(milk.post_calving_cost_kes, { cost: true }))}>
                <Money amount={milk.post_calving_cost_kes} className="tabular-nums" />
              </p>
            </div>
            <div>
              <p className="text-slate-700">{copy.awaitingPrice}</p>
              <p className={cn(
                'mt-1 text-body-strong tabular-nums',
                isUnknown(data.data_quality?.unpriced_saleable_liters) ? 'text-slate-500'
                  : Number(data.data_quality.unpriced_saleable_liters) > 0 ? 'text-red-700' : 'text-emerald-700'
              )}>
                {formatLitres(data.data_quality?.unpriced_saleable_liters)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="card-machined space-y-4 border border-slate-300 bg-white p-6 ">
              <h2 className="border-b border-slate-300 pb-3 text-section-title text-slate-900">

  {copy.expenses}
              </h2>
              {Object.keys(data.costs_by_type_kes || {}).length === 0 ? (
                <p className="text-body-strong text-red-700">{copy.noCosts}</p>
              ) : (
                <dl className="divide-y divide-slate-300 text-body">
                  {Object.entries(data.costs_by_type_kes).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-slate-700">{costTypeLabel(type)}</dt>
                      <dd className="text-body-strong text-slate-900"><Money amount={amount} className="tabular-nums" /></dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section className="card-machined space-y-4 border border-slate-300 bg-white p-6 ">
              <h2 className="border-b border-slate-300 pb-3 text-section-title text-slate-900">{copy.completeness}</h2>
              <dl className="divide-y divide-slate-300 text-body">
                <div className="py-2.5">
                  <dt className="text-slate-700">{copy.costMatching}</dt>
                  <dd className="mt-1 text-body-strong text-slate-900">{toReadableLabel(data.data_quality?.cost_attribution)}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-slate-700">{copy.incomeMatching}</dt>
                  <dd className="mt-1 text-body-strong text-slate-900">{toReadableLabel(data.data_quality?.milk_revenue_attribution)}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-slate-700">{copy.firstCalvingDate}</dt>
                  <dd className={cn('mt-1 text-body-strong', data.data_quality?.first_calving_recorded ? 'text-emerald-700' : 'text-red-700')}>
                    {data.data_quality?.first_calving_recorded ? copy.recorded : copy.notRecorded}
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
