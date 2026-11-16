import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Ruler, Save, Users } from 'lucide-react';
import { getApiErrorMessage, nutritionApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import { feedingGroupLabel } from '../../lib/feedingGroups';
import { feedCopy } from '../../i18n/feed';

const copy = feedCopy.groupPlanner;

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
        ['avg_body_weight_kg', '0.1'],
        ['dmi_percent_bw', '0.1'],
        ['target_protein_percent', '0.1'],
        ['feeding_times_per_day', '1'],
      ].map(([field, step]) => (
        <label key={field} className="text-[11px] font-semibold text-ink-muted">
          {copy.profileFields[field]}
          <input type="number" min="0.01" step={step} value={form[field]} onChange={(event) => update(field, event.target.value)} className="input-machined mt-1" required />
        </label>
      ))}
      <div className="col-span-2 flex justify-end sm:col-span-4">
        <button type="submit" disabled={isSaving} className="btn-command inline-flex items-center gap-2 px-3 py-2 text-xs">
          <Save size={13} /> {isSaving ? copy.saving : copy.saveProfile}
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
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-ink"><Ruler size={14} /> {copy.mixMeasure}</h4>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="text-[11px] font-semibold text-ink-muted">
          {copy.quantityDescribes}
          <select value={form.quantity_basis} onChange={(event) => update('quantity_basis', event.target.value)} className="input-machined mt-1">
            <option value="total_ration">{copy.totalRation}</option>
            <option value="concentrate">{copy.concentrateOnly}</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          {copy.concentrateRate}
          <input type="number" min="0.001" step="0.001" value={form.concentrate_kg_per_head_day} onChange={(event) => update('concentrate_kg_per_head_day', event.target.value)} className="input-machined mt-1" disabled={form.quantity_basis !== 'concentrate'} required={form.quantity_basis === 'concentrate'} />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          {copy.bulkDensity}
          <input type="number" min="0.0001" step="0.0001" value={form.bulk_density_kg_per_litre} onChange={(event) => update('bulk_density_kg_per_litre', event.target.value)} className="input-machined mt-1" />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          {copy.bucketSize}
          <input type="number" min="0.001" step="0.001" value={form.bucket_volume_litres} onChange={(event) => update('bucket_volume_litres', event.target.value)} className="input-machined mt-1" />
        </label>
        <label className="text-[11px] font-semibold text-ink-muted">
          {copy.scoop}
          <input type="number" min="0.001" step="0.001" value={form.scoop_weight_kg} onChange={(event) => update('scoop_weight_kg', event.target.value)} className="input-machined mt-1" />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={isSaving} className="btn-command inline-flex items-center gap-2 px-3 py-2 text-xs"><Save size={13} /> {isSaving ? copy.saving : copy.saveMeasures}</button>
      </div>
    </form>
  );
}

function GroupDetails({ group, profile, onSaveProfile, onSaveRecipe, isSavingProfile, isSavingRecipe }) {
  const recipe = group.assigned_recipe;
  const measures = group.physical_measures;
  return (
    <div className="py-4">
      {group.requires_concentrate_rate && <p className="mb-3 border-l-2 border-brand bg-brand-50 px-3 py-2 text-xs font-semibold text-ink">{copy.needsRate}</p>}
      {recipe ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="text-xs font-bold uppercase text-ink">{copy.ingredients(recipe.name)}</h4>
      <div className="mt-2 divide-y divide-ink/5 border-y border-ink/10">
              {recipe.ingredients.map((ingredient) => (
                <div key={ingredient.inventory_item_id} className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-2 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-4">
                  <span className="col-span-2 break-words font-semibold text-ink sm:col-span-1">{ingredient.name} ({Number(ingredient.percentage).toFixed(1)}%)</span>
                  <span className="text-right sm:text-left">{Number(ingredient.group_kg_per_feeding).toFixed(2)} {copy.perFeed}</span>
                  <span className="text-right sm:text-left">{Number(ingredient.daily_group_kg).toFixed(2)} {copy.perDay}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-ink">{copy.physicalMeasure}</h4>
            {measures ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink">
              {measures.kg_per_bucket && <p><strong>{Number(measures.group_buckets_per_feeding).toFixed(2)}</strong> {copy.bucketsPerFeed} <span className="text-ink-muted">{copy.each(Number(measures.kg_per_bucket).toFixed(2))}</span></p>}
              {measures.kg_per_scoop && <p><strong>{Number(measures.group_scoops_per_feeding).toFixed(2)}</strong> {copy.scoopsPerFeed} <span className="text-ink-muted">{copy.each(Number(measures.kg_per_scoop).toFixed(2))}</span></p>}
            </div> : <p className="mt-2 text-xs text-ink-muted">{copy.useKg}</p>}
          </div>
        </div>
      ) : <p className="text-xs font-semibold text-ink-muted">{copy.noRecipe}</p>}
      <ProfileEditor profile={profile} onSave={onSaveProfile} isSaving={isSavingProfile} />
      {recipe && <RecipeMeasurementEditor recipe={recipe} onSave={onSaveRecipe} isSaving={isSavingRecipe} />}
    </div>
  );
}

/** Opens the mixing planner ready to save a mix for this group (desktop and phone). */
function AssignMixButton({ group }) {
  const navigate = useNavigate();
  const label = feedingGroupLabel(group.feeding_group);
  return (
    <button
      type="button"
      onClick={() => navigate('/feed-nutrition/mix', { state: { feedingGroup: group.feeding_group, draftName: copy.draftName(label) } })}
      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-button bg-brand px-2.5 text-xs font-semibold text-white hover:bg-brand-dark"
      aria-label={copy.assignTo(label)}
    >
      <Plus size={15} /> {copy.assign}
    </button>
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
      setMessage(copy.profileSaved);
      queryClient.invalidateQueries({ queryKey: ['feeding-group-profiles', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['feeding-plan-by-group', tenantId, farmId] });
    },
    onError: (error) => setMessage(getApiErrorMessage(error, copy.profileFailed)),
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
      setMessage(copy.measuresSaved);
      queryClient.invalidateQueries({ queryKey: ['feeding-plan-by-group', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-recipes', tenantId, farmId] });
    },
    onError: (error) => setMessage(getApiErrorMessage(error, copy.measuresFailed)),
  });

  return (
    <section className="card-machined overflow-hidden bg-surface">
      <div className="flex flex-col gap-3 border-b border-ink/10 bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-brand"><Users size={18} /> {copy.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">{copy.subtitle}</p>
        </div>
        {message && <p className="text-xs font-semibold text-ink-muted" role="status">{message}</p>}
      </div>

      {planQuery.isLoading ? <div className="p-5 text-sm text-ink-muted">{copy.loading}</div> : groups.length === 0 ? <div className="p-5 text-sm text-ink-muted">{copy.empty}</div> : (
        <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-surface-raised text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <tr><th className="px-5 py-3">{copy.columns.group}</th><th className="px-5 py-3 text-right">{copy.columns.headcount}</th><th className="px-5 py-3 text-right">{copy.columns.perHeadDay}</th><th className="px-5 py-3 text-right">{copy.columns.perHeadFeeding}</th><th className="px-5 py-3 text-right">{copy.columns.dailyBatch}</th><th className="px-5 py-3 text-right">{copy.columns.batchFeeding}</th><th className="px-5 py-3">{copy.columns.recipe}</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {groups.map((group) => {
                const isExpanded = expandedGroup === group.feeding_group;
                const profile = profiles.find((item) => item.feeding_group === group.feeding_group) ?? { ...EMPTY_PROFILE, feeding_group: group.feeding_group };
                return (
                  <React.Fragment key={group.feeding_group}>
                    <tr className="hover:bg-surface-raised">
                      <td className="px-5 py-3"><span className="block text-sm font-semibold text-ink">{feedingGroupLabel(group.feeding_group)}</span><span className="text-[10px] font-bold uppercase text-ink-muted">{group.quantity_label}</span></td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{group.headcount}</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{Number(group.daily_kg_per_head || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">{Number(group.kg_per_head_per_feeding || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-brand tabular-nums">{Number(group.daily_group_batch_kg || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-ink tabular-nums">{Number(group.group_batch_per_feeding_kg || 0).toFixed(2)} kg</td>
                      <td className="px-5 py-3 text-xs text-ink-muted">{group.assigned_recipe?.name ?? <AssignMixButton group={group} />}</td>
                      <td className="px-5 py-3 text-right"><button type="button" onClick={() => setExpandedGroup(isExpanded ? null : group.feeding_group)} className="p-1 text-ink-muted hover:text-brand" aria-label={copy.editProfile(feedingGroupLabel(group.feeding_group))}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                    </tr>
                    {isExpanded && <tr><td colSpan={8} className="px-5 pb-4"><GroupDetails group={group} profile={profile} onSaveProfile={(feedingGroup, payload) => saveProfile.mutate({ group: feedingGroup, payload })} onSaveRecipe={(recipeId, payload) => saveRecipe.mutate({ recipeId, payload })} isSavingProfile={saveProfile.isPending} isSavingRecipe={saveRecipe.isPending} /></td></tr>}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t border-ink/10 bg-surface-raised text-xs font-bold text-ink">
              <tr><td className="px-5 py-3">{copy.total(totals.total_active_animals ?? 0)}</td><td /><td /><td /><td className="px-5 py-3 text-right tabular-nums">{Number(totals.total_planned_mix_kg || 0).toFixed(2)} kg</td><td colSpan={3} /></tr>
            </tfoot>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.feeding_group;
            const profile = profiles.find((item) => item.feeding_group === group.feeding_group) ?? { ...EMPTY_PROFILE, feeding_group: group.feeding_group };
            return (
              <article key={group.feeding_group} className="min-w-0 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-ink">{feedingGroupLabel(group.feeding_group)}</h3>
                  </div>
                  <span className="shrink-0 rounded-badge border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-dark">{group.assigned_recipe ? copy.assigned : copy.notAssigned}</span>
                </div>
                <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 rounded-lg bg-brand-50 p-3 text-xs">
                  <div className="min-w-0"><dt className="text-ink-muted">{copy.headcount}</dt><dd className="mt-0.5 font-semibold tabular-nums text-ink">{group.headcount}</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">{copy.dailyPerHead}</dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-ink">{Number(group.daily_kg_per_head || 0).toFixed(2)} kg</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">{copy.perHeadFeeding}</dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-ink">{Number(group.kg_per_head_per_feeding || 0).toFixed(2)} kg</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">{copy.dailyBatch}</dt><dd className="mt-0.5 break-words font-bold tabular-nums text-brand">{Number(group.daily_group_batch_kg || 0).toFixed(2)} kg</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">{copy.batchFeeding}</dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-ink">{Number(group.group_batch_per_feeding_kg || 0).toFixed(2)} kg</dd></div>
                </dl>
                <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-ink/10 pt-3">
                  <p className="min-w-0 break-words text-xs text-ink-muted">{group.quantity_label}{group.assigned_recipe?.name ? ` · ${group.assigned_recipe.name}` : ''}</p>
                  {group.assigned_recipe ? (
                    <button type="button" onClick={() => setExpandedGroup(isExpanded ? null : group.feeding_group)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-button border border-brand/20 px-2.5 text-xs font-semibold text-brand-dark" aria-label={copy.recipeDetailsLabel(isExpanded, feedingGroupLabel(group.feeding_group))} aria-expanded={isExpanded}>{isExpanded ? <><ChevronUp size={15} /> {copy.close}</> : <><ChevronDown size={15} /> {copy.recipeDetails}</>}</button>
                  ) : (
                    <AssignMixButton group={group} />
                  )}
                </div>
                {isExpanded && <GroupDetails group={group} profile={profile} onSaveProfile={(feedingGroup, payload) => saveProfile.mutate({ group: feedingGroup, payload })} onSaveRecipe={(recipeId, payload) => saveRecipe.mutate({ recipeId, payload })} isSavingProfile={saveProfile.isPending} isSavingRecipe={saveRecipe.isPending} />}
              </article>
            );
          })}
          <div className="bg-brand-50 px-4 py-3 text-xs font-bold text-ink">
            <div>{copy.total(totals.total_active_animals ?? 0)}</div>
            <div className="mt-1 text-brand">{copy.plannedMix(Number(totals.total_planned_mix_kg || 0).toFixed(2))}</div>
          </div>
        </div>
        </>
      )}
    </section>
  );
}
