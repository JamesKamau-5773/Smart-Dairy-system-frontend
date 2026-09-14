import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CircleDollarSign, Milk, Sprout, Wallet } from 'lucide-react';
import { herdApi, reportsApi } from '../../lib/backendApi';
import Money from '../../components/ui/Money';
import { useTenant } from '../../hooks/useTenant';

const Metric = ({ label, value, icon: Icon }) => (
  <div className="card-machined p-5">
    <div className="flex items-center gap-3 text-brand"><Icon size={18} /><span className="text-xs font-bold uppercase tracking-wider">{label}</span></div>
    <div className="mt-3 text-2xl font-black text-ink">{value}</div>
  </div>
);

export default function AnimalEconomicsReport() {
  const { tenantId, farmId } = useTenant();
  const [animalId, setAnimalId] = useState('');
  const { data: animals = [] } = useQuery({ queryKey: ['herd', tenantId, farmId], queryFn: () => herdApi.list(), enabled: !!tenantId && !!farmId });
  const report = useQuery({ queryKey: ['animal-economics', tenantId, farmId, animalId], queryFn: () => reportsApi.getAnimalEconomics(animalId), enabled: !!tenantId && !!farmId && !!animalId });
  const data = report.data;

  return <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
    <div className="border-b border-ink/10 pb-6">
      <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider"><Activity size={15} /> Animal Economics</div>
      <h1 className="font-sans font-black text-3xl text-ink mt-2">Heifer Rearing Cost & Lifetime Contribution</h1>
      <p className="text-sm text-ink-muted mt-2">Direct animal costs are exact. Milk revenue is allocated from each day&apos;s saleable herd output.</p>
    </div>
    <label className="form-control max-w-md"><span className="label-text">Select animal</span><select value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="input-machined"><option value="">Choose an animal</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number || animal.tag || animal.id}{animal.name ? ` - ${animal.name}` : ''}</option>)}</select></label>
    {report.isLoading && <p className="text-sm text-ink-muted">Calculating lifecycle economics...</p>}
    {report.isError && <p className="text-sm text-danger">Unable to load animal economics.</p>}
    {data && <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"><span><strong className="text-ink">{data.animal.tag_number}</strong>{data.animal.name ? ` - ${data.animal.name}` : ''}</span><span>First calving: {data.animal.first_calving_date || 'Not recorded'}</span><span className="font-bold text-ink">Attribution: {data.data_quality.attribution_quality}</span></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Metric label="Heifer Rearing Cost" value={<Money amount={data.rearing_cost.amount_kes} />} icon={Sprout} /><Metric label="Lifetime Milk Contribution" value={<Money amount={data.lifetime_milk_contribution.amount_kes} />} icon={Milk} /><Metric label="Lifetime Net Contribution" value={<Money amount={data.lifetime_net_contribution_kes} />} icon={CircleDollarSign} /></div>
      <div className="card-machined p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm"><div><p className="text-ink-muted">Saleable milk</p><p className="font-bold text-lg">{data.lifetime_milk_contribution.saleable_milk_liters} L</p></div><div><p className="text-ink-muted">Allocated milk revenue</p><p className="font-bold text-lg"><Money amount={data.lifetime_milk_contribution.allocated_milk_revenue_kes} /></p></div><div><p className="text-ink-muted">Post-calving costs</p><p className="font-bold text-lg"><Money amount={data.lifetime_milk_contribution.post_calving_cost_kes} /></p></div><div><p className="text-ink-muted">Unpriced saleable milk</p><p className="font-bold text-lg">{data.data_quality.unpriced_saleable_liters} L</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card-machined p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Wallet size={16} /> Attributable costs by type</h2>
          {Object.keys(data.costs_by_type_kes || {}).length === 0 ? <p className="mt-4 text-sm text-ink-muted">No direct animal costs have been recorded.</p> : <dl className="mt-4 space-y-2 text-sm">{Object.entries(data.costs_by_type_kes).map(([type, amount]) => <div key={type} className="flex items-center justify-between border-b border-ink/10 pb-2"><dt className="text-ink-muted">{type.replaceAll('_', ' ')}</dt><dd className="font-bold text-ink"><Money amount={amount} /></dd></div>)}</dl>}
        </section>
        <section className="card-machined p-5">
          <h2 className="text-sm font-bold text-ink">Data quality</h2>
          <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-ink-muted">Cost attribution</dt><dd className="font-bold text-ink">{data.data_quality.cost_attribution.replaceAll('_', ' ')}</dd></div><div><dt className="text-ink-muted">Milk revenue attribution</dt><dd className="font-bold text-ink">{data.data_quality.milk_revenue_attribution.replaceAll('_', ' ')}</dd></div><div><dt className="text-ink-muted">First calving record</dt><dd className="font-bold text-ink">{data.data_quality.first_calving_recorded ? 'Recorded' : 'Not recorded'}</dd></div></dl>
        </section>
      </div>
    </>}
  </div>;
}
