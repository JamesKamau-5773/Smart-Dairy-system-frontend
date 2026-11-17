import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LABELS from '../../../lib/labels';
import { herdCopy, herdStatusLabel } from '../../../i18n/herd';
import { animalYieldTargetService, isLactatingStatus } from '../../../services/animalYieldTargetService';

export default function AnimalNutritionPlanner({ animal, tenantId, farmId }) {
  const copy = herdCopy.record.planner;
  const queryClient = useQueryClient();
  const [targetYield, setTargetYield] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [feedEfficiency, setFeedEfficiency] = useState(0.5);
  const [feedPrice, setFeedPrice] = useState(60);
  const [feedCurrency, setFeedCurrency] = useState('KES');
  const [plannerResult, setPlannerResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const currentPeakYield = Number.parseFloat((animal?.peakYield || animal?.milk || '0').toString().replace(/[^0-9.]/g, '')) || 0;
  const isLactating = isLactatingStatus(animal?.current_status ?? animal?.currentStatus ?? animal?.status);

  const targetQuery = useQuery({
    queryKey: ['animal-yield-target', tenantId, farmId, animal?.id],
    queryFn: () => animalYieldTargetService.getTarget({ cow: animal, tenantId, farmId }),
    enabled: Boolean(animal?.id && tenantId),
  });

  useEffect(() => {
    if (targetQuery.data?.targetLiters) {
      setTargetYield(String(targetQuery.data.targetLiters));
    }
  }, [targetQuery.data?.targetLiters]);

  const saveTargetMutation = useMutation({
    mutationFn: () => animalYieldTargetService.saveTarget({
      cow: animal,
      targetLiters: targetYield,
      tenantId,
      farmId,
    }),
    onSuccess: async (savedTarget) => {
      setSaveError('');
      setSaveMessage(
        savedTarget.isActive
          ? copy.goalSaved(savedTarget.targetLiters.toFixed(1), animal?.name || animal?.id)
          : copy.goalSavedInactive(savedTarget.targetLiters.toFixed(1), animal?.name || animal?.id)
      );
      await queryClient.invalidateQueries({ queryKey: ['animal-yield-target', tenantId, farmId, animal?.id] });
    },
    onError: (error) => {
      setSaveMessage('');
      setSaveError(error?.message || copy.goalFailed);
    },
  });

  return (
    <div className="rounded-2xl border border-ink/10 bg-surface p-6 ">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6 lg:border-r lg:border-ink/10 lg:pr-8">
          <div>
            <h3 className="mb-1 text-section-title text-ink-muted">{LABELS.CURRENT_PRODUCTION}</h3>
            <p className="text-stat-value text-ink">{currentPeakYield} <span className="text-body-strong text-ink-muted">{copy.perDay}</span></p>
          </div>

          {!isLactating && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-body text-amber-700">
              {copy.notMilking((animal?.current_status ?? animal?.currentStatus ?? animal?.status) ? herdStatusLabel(animal?.current_status ?? animal?.currentStatus ?? animal?.status) : copy.inactive)}
            </div>
          )}

          {targetQuery.data?.targetLiters && (
            <div className="rounded-xl border border-brand/15 bg-brand/5 px-4 py-3 text-body text-brand">
              {copy.savedGoal} <strong>{targetQuery.data.targetLiters.toFixed(1)} {copy.perDay}</strong>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-field-label text-ink-muted">{copy.goal}</label>
              <input type="number" placeholder={copy.goalPlaceholder} value={targetYield} onChange={(event) => setTargetYield(event.target.value)} className="w-full rounded-lg border border-ink/20 bg-surface p-2.5 text-control text-ink outline-none transition-colors focus:border-brand" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-field-label text-ink-muted" title={LABELS.PERIOD_DAYS}>{LABELS.PERIOD_DAYS}</label>
                <input type="number" value={horizonDays} onChange={(event) => setHorizonDays(Number(event.target.value))} className="w-full rounded-lg border border-ink/20 bg-surface p-2.5 text-control text-ink outline-none focus:border-brand" />
              </div>

              <div>
                <label className="mb-1.5 block text-field-label text-ink-muted" title={LABELS.MEAL_RATIO}>{LABELS.MEAL_RATIO}</label>
                <input type="number" step="0.1" value={feedEfficiency} onChange={(event) => setFeedEfficiency(Number(event.target.value))} className="w-full rounded-lg border border-ink/20 bg-surface p-2.5 text-control text-ink outline-none focus:border-brand" />
                <p className="mt-1 text-meta text-ink-muted">{copy.ratioHint}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-field-label text-ink-muted" title={LABELS.PRICE_PER_KG}>{LABELS.PRICE_PER_KG}</label>
                <input type="number" placeholder={copy.pricePlaceholder} value={feedPrice} onChange={(event) => setFeedPrice(Number(event.target.value))} className="w-full rounded-lg border border-ink/20 bg-surface p-2.5 text-control text-ink outline-none focus:border-brand" />
              </div>
            </div>
          </div>

          {saveMessage && <p className="text-body text-brand">{saveMessage}</p>}
          {saveError && <p className="text-body text-danger">{saveError}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const target = Number(targetYield);

                if (!target || target <= currentPeakYield) {
                  setPlannerResult({ error: copy.goalTooLow });
                  return;
                }

                const extraLitresPerDay = Math.max(0, target - currentPeakYield);
                const extraFeedPerDayKg = extraLitresPerDay * feedEfficiency;
                const totalExtraFeedKg = extraFeedPerDayKg * horizonDays;
                const totalCost = totalExtraFeedKg * feedPrice;

                setPlannerResult({
                  current: currentPeakYield,
                  target,
                  extraLitresPerDay: Number(extraLitresPerDay.toFixed(1)),
                  extraFeedPerDayKg: Number(extraFeedPerDayKg.toFixed(1)),
                  totalExtraFeedKg: Number(totalExtraFeedKg.toFixed(1)),
                  totalCost: Number(totalCost.toFixed(2)),
                  horizonDays,
                });
              }}
              className="btn-command flex-1 justify-center px-6 py-2.5"
            >

    {copy.plan}
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveMessage('');
                setSaveError('');
                saveTargetMutation.mutate();
              }}
              disabled={saveTargetMutation.isPending || !Number(targetYield)}
              className="btn-secondary px-6 py-2.5 disabled:opacity-60"
            >
              {saveTargetMutation.isPending ? copy.saving : copy.saveGoal}
            </button>
            <button type="button" onClick={() => { setTargetYield(''); setPlannerResult(null); }} className="btn-secondary px-6 py-2.5">{copy.reset}</button>
          </div>
        </div>

        <div className="flex min-h-[250px] flex-col">
          <h3 className="mb-4 text-section-title text-ink-muted">{copy.feedingPlan}</h3>
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-surface-warm/30 p-8 text-center">
            {targetQuery.isLoading && <p className="text-meta text-ink-muted">{copy.loadingGoal}</p>}
            {!plannerResult && (
              <>
                <p className="text-body-strong text-ink">{LABELS.READY_TO_CALCULATE_TITLE}</p>
                <p className="mt-1 max-w-[200px] text-meta text-ink-muted">{LABELS.READY_TO_CALCULATE_DESC}</p>
              </>
            )}

            {plannerResult && plannerResult.error && <div className="text-body-strong text-danger">{plannerResult.error}</div>}

            {plannerResult && !plannerResult.error && (
              <div className="w-full space-y-2 text-body">
                <div className="flex items-center justify-between border-b py-2"><span className="text-ink-muted">{LABELS.CURRENT_MILK}</span><strong className="tabular-nums">{plannerResult.current.toLocaleString(undefined, { maximumFractionDigits: 2 })} {copy.perDay}</strong></div>
                <div className="flex items-center justify-between border-b py-2"><span className="text-ink-muted">{LABELS.TARGET_MILK}</span><strong className="tabular-nums">{plannerResult.target.toLocaleString(undefined, { maximumFractionDigits: 2 })} {copy.perDay}</strong></div>
                <div className="flex items-center justify-between border-b py-2"><span className="text-ink-muted">{copy.extraMilk}</span><strong className="tabular-nums">{plannerResult.extraLitresPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</strong></div>
                <div className="flex items-center justify-between border-b py-2"><span className="text-ink-muted">{LABELS.EXTRA_DAIRY_MEAL}</span><strong className="tabular-nums">{plannerResult.extraFeedPerDayKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</strong></div>
                <div className="flex items-center justify-between border-b py-2"><span className="text-ink-muted">{LABELS.TOTAL_EXTRA_DAIRY_MEAL} ({copy.days(plannerResult.horizonDays)})</span><strong className="tabular-nums">{plannerResult.totalExtraFeedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</strong></div>
                <div className="flex items-center justify-between py-2"><span className="text-ink-muted">{LABELS.ESTIMATED_COST}</span><strong className="tabular-nums">{feedCurrency ? `${feedCurrency} ${plannerResult.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : plannerResult.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}