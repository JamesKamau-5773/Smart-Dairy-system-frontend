import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Ruler, Save, Users } from 'lucide-react';
import { nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

const GROUP_LABELS = {
  lactating: 'Lactating',
  dry: 'Dry cows',
  calf_0_3m: 'Calves 0-3 months',
  calf_3_6m: 'Calves 3-6 months',
  heifer: 'Heifers',
};

const EMPTY_PROFILE = {
  avg_body_weight_kg: '',
  dmi_percent_bw: '',
  target_protein_percent: '',
  feeding_times_per_day: '',
};

function normalizeProfiles(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.profiles) ? data.profiles : [];
}

function ProfileEditor({ profile, onSave, isSaving }) {
  const [form, setForm] = useState(() => ({
    avg_body_weight_kg: profile.avg_body_weight_kg ?? '',
    dmi_percent_bw: profile.dmi_percent_bw ?? '',
    target_protein_percent: profile.target_protein_percent ?? '',
    feeding_times_per_day: profile.feeding_times_per_day ?? '',
  }));

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form className="mt-3 grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); onSave(profile.feeding_group, form); }}>
      {[
        ['avg_body_weight_kg', 'Avg weight (kg)', '0.1'],
        ['dmi_percent_bw', 'DMI (% body weight)', '0.1'],
        ['target_protein_percent', 'Protein target (%)', '0.1'],
        ['feeding_times_per_day', 'Feeds per day', '1'],
      ].map(([field, label, step]) => (
        <label key={field} className="text-[11px] font-semibold text-ink-muted">
          {label}
          <input type="number" min="0.01" step={step} value={form[field]} onChange={(event) => update(field, event.target.value)} className="input-machined mt-1" required />
        </label>
      ))}
      <div className="col-span-2 flex justify-end sm:col-span-4">
        <button type="submit" disabled={isSaving} className="btn-command inline-flex items-center gap-2 px-3 py-2 text-xs">
          <Save size={13} /> {isSaving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

function RecipeMeasurementEditor({ recipe, onSave, isSaving }) {
  const [form, setForm] = useState(() => ({
    quantity_basis: recipe.quantity_basis ?? 'total_ration',
    concentrate_kg_per_head_day: recipe.concentrate_kg_per_head_day ?? '',
    bulk_density_kg_per_litre: recipe.bulk_density_kg_per_litre ?? '',
    bucket_volume_litres: recipe.bucket_volume_litres ?? '',
    scoop_weight_kg: recipe.scoop_weight_kg ?? '',
  }));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form className="mt-4 border-t border-ink/10 pt-4" onSubmit={(event) => { event.preventDefault(); onSave(recipe.id, form); }}>
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-ink"><Ruler size={14} /> Mix quantity and measure</h4>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="text-[11px] font-semibold text-ink-muted">
          Quantity describes
          <select value={form.quantity_basis} onChange={(event) => update('quantity_basis', event.target.value)} className="input-machined mt-1">
            <option value="total_ration">Total ration (dry matter)</option>
            <option value="concentrate">Concentrate only</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          Concentrate kg/head/day
          <input type="number" min="0.001" step="0.001" value={form.concentrate_kg_per_head_day} onChange={(event) => update('concentrate_kg_per_head_day', event.target.value)} className="input-machined mt-1" disabled={form.quantity_basis !== 'concentrate'} required={form.quantity_basis === 'concentrate'} />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          Bulk density (kg/litre)
          <input type="number" min="0.0001" step="0.0001" value={form.bulk_density_kg_per_litre} onChange={(event) => update('bulk_density_kg_per_litre', event.target.value)} className="input-machined mt-1" />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          Bucket size (litres)
          <input type="number" min="0.001" step="0.001" value={form.bucket_volume_litres} onChange={(event) => update('bucket_volume_litres', event.target.value)} className="input-machined mt-1" />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          Calibrated scoop (kg)
          <input type="number" min="0.001" step="0.001" value={form.scoop_weight_kg} onChange={(event) => update('scoop_weight_kg', event.target.value)} className="input-machined mt-1" />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={isSaving} className="btn-command inline-flex items-center gap-2 px-3 py-2 text-xs"><Save size={13} /> {isSaving ? 'Saving...' : 'Save mix measures'}</button>
      </div>
    </form>
  );
}

function GroupDetails({ group, profile, onSaveProfile, onSaveRecipe, isSavingProfile, isSavingRecipe }) {
  const recipe = group.assigned_recipe;
  const measures = group.physical_measures;
  return (
    <div className="py-4">
      {group.requires_concentrate_rate && <p className="mb-3 border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">Set concentrate kg/head/day before using this feeding instruction.</p>}
      {recipe ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="text-xs font-bold uppercase text-ink">{recipe.name} ingredients</h4>
            <div className="mt-2 divide-y divide-ink/5 border-y border-ink/10">
              {recipe.ingredients.map((ingredient) => (
                <div key={ingredient.inventory_item_id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-xs">
                  <span className="font-semibold text-ink">{ingredient.name} ({Number(ingredient.percentage).toFixed(1)}%)</span>
                  <span>{Number(ingredient.group_kg_per_feeding).toFixed(2)} kg/feed</span>
                  <span>{Number(ingredient.daily_group_kg).toFixed(2)} kg/day</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-ink">Physical measure</h4>
            {measures ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink">
              {measures.kg_per_bucket && <p><strong>{Number(measures.group_buckets_per_feeding).toFixed(2)}</strong> buckets/feed <span className="text-ink-muted">({Number(measures.kg_per_bucket).toFixed(2)} kg each)</span></p>}
              {measures.kg_per_scoop && <p><strong>{Number(measures.group_scoops_per_feeding).toFixed(2)}</strong> scoops/feed <span className="text-ink-muted">({Number(measures.kg_per_scoop).toFixed(2)} kg each)</span></p>}
            </div> : <p className="mt-2 text-xs text-ink-muted">Use kilograms until a bucket or scoop is calibrated for this finished mix.</p>}
          </div>
        </div>
      ) : <p className="text-xs font-semibold text-ink-muted">No active recipe is assigned to this feeding group. Assign one while saving a formulation.</p>}
      <ProfileEditor profile={profile} onSave={onSaveProfile} isSaving={isSavingProfile} />
      {recipe && <RecipeMeasurementEditor recipe={recipe} onSave={onSaveRecipe} isSaving={isSavingRecipe} />}
    </div>
  );
}

export default function FeedingGroupPlanner() {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [message, setMessage] = useState('');

  const profilesQuery = useQuery({
    queryKey: ['feeding-group-profiles', tenantId, farmId],
    queryFn: () => nutritionApi.listFeedingGroupProfiles(),
    enabled: !!tenantId && !!farmId,
  });
  const planQuery = useQuery({
    queryKey: ['feeding-plan-by-group', tenantId, farmId],
    queryFn: () => nutritionApi.getFeedingPlanByGroup(),
    enabled: !!tenantId && !!farmId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const profiles = useMemo(() => normalizeProfiles(profilesQuery.data), [profilesQuery.data]);
  const groups = Array.isArray(planQuery.data?.groups) ? planQuery.data.groups : [];
  const totals = planQuery.data?.totals ?? {};

  const saveProfile = useMutation({
    mutationFn: ({ group, payload }) => nutritionApi.updateFeedingGroupProfile(group, {
      avg_body_weight_kg: Number(payload.avg_body_weight_kg),
      dmi_percent_bw: Number(payload.dmi_percent_bw),
      target_protein_percent: Number(payload.target_protein_percent),
      feeding_times_per_day: Number(payload.feeding_times_per_day),
    }),
    onSuccess: () => {
      setMessage('Profile saved. Feeding plan refreshed.');
      queryClient.invalidateQueries({ queryKey: ['feeding-group-profiles', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['feeding-plan-by-group', tenantId, farmId] });
    },
    onError: (error) => setMessage(error?.response?.data?.error || 'Could not save this profile.'),
  });
  const saveRecipe = useMutation({
    mutationFn: ({ recipeId, payload }) => nutritionApi.updateRecipe(recipeId, {
      quantity_basis: payload.quantity_basis,
      concentrate_kg_per_head_day: payload.quantity_basis === 'concentrate' ? Number(payload.concentrate_kg_per_head_day) : null,
      bulk_density_kg_per_litre: payload.bulk_density_kg_per_litre === '' ? null : Number(payload.bulk_density_kg_per_litre),
      bucket_volume_litres: payload.bucket_volume_litres === '' ? null : Number(payload.bucket_volume_litres),
      scoop_weight_kg: payload.scoop_weight_kg === '' ? null : Number(payload.scoop_weight_kg),
    }),
    onSuccess: () => {
      setMessage('Mix measures saved. Feeding quantities refreshed.');
      queryClient.invalidateQueries({ queryKey: ['feeding-plan-by-group', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-recipes', tenantId, farmId] });
    },
    onError: (error) => setMessage(error?.response?.data?.error || 'Could not save mix measures.'),
  });

  return (
    <section className="card-machined overflow-hidden bg-surface">
      <div className="flex flex-col gap-3 border-b border-ink/10 bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-brand"><Users size={18} /> Herd Feeding Groups</h2>
          <p className="mt-1 text-xs text-ink-muted">Kilograms are authoritative. Buckets and scoops appear only after calibration for the assigned mix.</p>
        </div>
        {message && <p className="text-xs font-semibold text-ink-muted" role="status">{message}</p>}
      </div>

      {planQuery.isLoading ? <div className="p-5 text-sm text-ink-muted">Loading group plan...</div> : groups.length === 0 ? <div className="p-5 text-sm text-ink-muted">No feeding groups are available yet.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-surface-raised text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <tr><th className="px-5 py-3">Group / quantity basis</th><th className="px-5 py-3 text-right">Headcount</th><th className="px-5 py-3 text-right">kg/head/day</th><th className="px-5 py-3 text-right">kg/head/feeding</th><th className="px-5 py-3 text-right">Daily group batch</th><th className="px-5 py-3 text-right">Batch/feeding</th><th className="px-5 py-3">Recipe</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {groups.map((group) => {
                const isExpanded = expandedGroup === group.feeding_group;
                const profile = profiles.find((item) => item.feeding_group === group.feeding_group) ?? { ...EMPTY_PROFILE, feeding_group: group.feeding_group };
                return (
                  <React.Fragment key={group.feeding_group}>
                    <tr className="hover:bg-surface-raised">
                      <td className="px-5 py-3"><span className="block text-sm font-semibold text-ink">{GROUP_LABELS[group.feeding_group] ?? group.feeding_group}</span><span className="text-[10px] font-bold uppercase text-ink-muted">{group.quantity_label}</span></td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{group.headcount}</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{Number(group.daily_kg_per_head || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{Number(group.kg_per_head_per_feeding || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-brand tabular-nums">{Number(group.daily_group_batch_kg || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-ink tabular-nums">{Number(group.group_batch_per_feeding_kg || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-xs text-ink-muted">{group.assigned_recipe?.name ?? 'Not assigned'}</td>
                      <td className="px-5 py-3 text-right"><button type="button" onClick={() => setExpandedGroup(isExpanded ? null : group.feeding_group)} className="p-1 text-ink-muted hover:text-brand" aria-label={`Edit ${GROUP_LABELS[group.feeding_group] ?? group.feeding_group} profile`}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                    </tr>
                    {isExpanded && <tr><td colSpan={8} className="px-5 pb-4"><GroupDetails group={group} profile={profile} onSaveProfile={(feedingGroup, payload) => saveProfile.mutate({ group: feedingGroup, payload })} onSaveRecipe={(recipeId, payload) => saveRecipe.mutate({ recipeId, payload })} isSavingProfile={saveProfile.isPending} isSavingRecipe={saveRecipe.isPending} /></td></tr>}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t border-ink/10 bg-surface-raised text-xs font-bold text-ink">
              <tr><td className="px-5 py-3">Total ({totals.total_active_animals ?? 0} active animals)</td><td /><td /><td /><td className="px-5 py-3 text-right tabular-nums">{Number(totals.total_planned_mix_kg || 0).toFixed(2)} kg</td><td colSpan={3} /></tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
