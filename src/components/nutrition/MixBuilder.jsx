import React, { useMemo, useState, useRef } from 'react';
import { Plus, Trash2, Save, Scale, Coins, BarChart3, CheckCircle2, Copy, FolderHeart, Wheat, Zap } from 'lucide-react';

const HISTORY_KEY = 'feed_mix_batches';
const TEMPLATE_KEY = 'feed_mix_templates';

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `mix-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createRow = () => ({
  id: makeId(),
  ingredientId: '',
  weight: '',
});

const normalizeInventory = (inventoryItems = []) => {
  const source = Array.isArray(inventoryItems) ? inventoryItems : [];

  return source.map((item) => ({
    ...item,
    unit: item.unit || 'KG',
    costPerKg: Number(item.costPerKg ?? item.cost_per_kg ?? 0),
    color: item.color || '#a8a29e',
  }));
};

const readHistory = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readSavedTemplates = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const calculateMixMetrics = (rows, inventory) => {
  let totalWeight = 0;
  let totalCost = 0;

  const processedRows = rows.map((row) => {
    const item = inventory.find((entry) => entry.id === row.ingredientId);
    const weight = Number(row.weight) || 0;
    const costPerKg = item?.costPerKg || 0;
    const cost = weight * costPerKg;

    totalWeight += weight;
    totalCost += cost;

    return {
      ...row,
      item,
      weight,
      cost,
      costPerKg,
    };
  });

  const finalizedRows = processedRows.map((row) => ({
    ...row,
    percentage: totalWeight > 0 ? (row.weight / totalWeight) * 100 : 0,
  }));

  return {
    rows: finalizedRows,
    totalWeight,
    totalCost,
    costPerKg: totalWeight > 0 ? totalCost / totalWeight : 0,
  };
};

const createBatchPayload = ({
  mixType,
  templateName,
  saveAsTemplate,
  activeTemplateId,
  proteinTarget,
  metrics,
  activeRows,
}) => {
  const name = templateName.trim() || 'Custom Quick Mix';

  return {
    id: makeId(),
    mixType,
    savedAt: new Date().toISOString(),
    batchName: name,
    isSavedAsTemplate: saveAsTemplate,
    templateId: activeTemplateId || null,
    proteinTarget,
    templateName: name,
    totalWeight: metrics.totalWeight,
    totalCost: metrics.totalCost,
    costPerKg: metrics.costPerKg,
    ingredients: activeRows.map((row) => ({
      ingredientId: row.ingredientId,
      ingredientName: row.item?.name || row.ingredientId,
      weight: row.weight,
      percentage: row.percentage,
      lockedPrice: row.item?.costPerKg || 0,
    })),
  };
};

const createTemplateSnapshot = ({
  activeTemplateId,
  templateName,
  proteinTarget,
  activeRows,
  templates,
  batchName,
}) => {
  const now = new Date().toISOString();

  return {
    id: activeTemplateId || `tpl_${makeId()}`,
    name: templateName.trim() || 'Untitled Template',
    proteinTarget,
    ingredients: activeRows.map((row) => ({
      ingredientId: row.ingredientId,
      ingredientName: row.item?.name || row.ingredientName || row.ingredientId,
      weight: String(row.weight),
      lockedPrice: row.item?.costPerKg || 0,
    })),
    batchName,
    updatedAt: now,
    createdAt: templates.find((template) => template.id === activeTemplateId)?.createdAt || now,
  };
};

function SummaryCard({ icon: Icon, label, value, unit }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-surface-warm p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-2 text-2xl font-black text-brand">{value}</div>
      <div className="text-xs text-ink-muted">{unit}</div>
    </div>
  );
}

export default function MixBuilder({ inventoryItems = [], isLoading = false, onSave }) {
  const inventory = useMemo(() => {
    const normalized = normalizeInventory(inventoryItems);
    return normalized;
  }, [inventoryItems]);

  const [mixType, setMixType] = useState('concentrate'); // 'concentrate' or 'tmr'

  // Component state for the active mix type
  const [rows, setRows] = useState(() => [createRow()]);
  const [templateName, setTemplateName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [proteinTarget, setProteinTarget] = useState('16');

  // Backing store for inactive tab's state
  const mixTypeStates = useRef({
    concentrate: {
      rows: [createRow()],
      templateName: '',
      saveAsTemplate: false,
      activeTemplateId: '',
      proteinTarget: '16',
    },
    tmr: {
      rows: [createRow()],
      templateName: '',
      saveAsTemplate: false,
      activeTemplateId: '',
      proteinTarget: '14',
    },
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState(() => readHistory());
  const [savedTemplates, setSavedTemplates] = useState(() => readSavedTemplates());

  const handleMixTypeChange = (newType) => {
    if (newType === mixType) return;
    // Save current UI state to the ref
    mixTypeStates.current[mixType] = { rows, templateName, saveAsTemplate, activeTemplateId, proteinTarget };
    // Load new state from ref into UI state
    const nextState = mixTypeStates.current[newType];
    setRows(nextState.rows); setTemplateName(nextState.templateName); setSaveAsTemplate(nextState.saveAsTemplate); setActiveTemplateId(nextState.activeTemplateId); setProteinTarget(nextState.proteinTarget);
    setMixType(newType);
  };

  const templates = useMemo(() => {
    const byId = new Map();

    savedTemplates.forEach((template) => {
      byId.set(template.id, template);
    });

    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [savedTemplates]);

  const metrics = useMemo(() => calculateMixMetrics(rows, inventory), [rows, inventory]);

  const activeRows = metrics.rows.filter((row) => row.item && row.weight > 0);
  const missingRows = metrics.rows.filter((row) => row.ingredientId && !row.item);

  const syncTemplates = (nextTemplates) => {
    setSavedTemplates(nextTemplates);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TEMPLATE_KEY, JSON.stringify(nextTemplates));
    }
  };

  const handleLoadTemplate = (templateId) => {
    setActiveTemplateId(templateId);

    if (!templateId) {
      setRows([createRow()]);
      setTemplateName('');
      setSaveAsTemplate(false);
      setStatusMessage('');
      return;
    }

    const selectedTemplate = templates.find((template) => template.id === templateId);

    if (!selectedTemplate) {
      setStatusMessage('Template not found.');
      return;
    }

    const templateRows = selectedTemplate.ingredients.map((ingredient) => ({
      id: makeId(),
      ingredientId: ingredient.ingredientId,
      ingredientName: ingredient.ingredientName || ingredient.ingredientId,
      weight: ingredient.weight,
    }));

    setRows(templateRows.length > 0 ? templateRows : [createRow()]);
    setTemplateName(selectedTemplate.name);
    setProteinTarget(selectedTemplate.proteinTarget || '');
    setSaveAsTemplate(true);
    setStatusMessage(`Loaded template "${selectedTemplate.name}".`);
  };

  const addRow = () => {
    setRows((currentRows) => [...currentRows, createRow()]);
  };

  const removeRow = (rowId) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const updateRow = (rowId, field, value) => {
    setRows((currentRows) => currentRows.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      if (field === 'ingredientId') {
        const matchedItem = inventory.find((entry) => entry.id === value);

        return {
          ...row,
          ingredientId: value,
          ingredientName: matchedItem?.name || row.ingredientName || '',
        };
      }

      return { ...row, [field]: value };
    }));
  };

  const handleSave = () => {
    if (activeRows.length === 0 || metrics.totalWeight <= 0) {
      setStatusMessage('Add at least one ingredient before saving the batch.');
      return;
    }

    if (missingRows.length > 0) {
      setStatusMessage('Some template ingredients are missing from inventory. Update them before saving.');
      return;
    }

    const payload = createBatchPayload({
      mixType,
      templateName,
      saveAsTemplate,
      activeTemplateId,
      proteinTarget,
      metrics,
      activeRows,
    });

    if (saveAsTemplate) {
      const nextTemplate = createTemplateSnapshot({
        activeTemplateId,
        templateName,
        proteinTarget,
        activeRows,
        templates,
        batchName: payload.batchName,
      });

      const nextTemplates = [
        nextTemplate,
        ...savedTemplates.filter((template) => template.id !== nextTemplate.id),
      ];

      syncTemplates(nextTemplates);
      setActiveTemplateId(nextTemplate.id);
    }

    const nextHistory = [payload, ...history].slice(0, 5);
    setHistory(nextHistory);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }

    if (typeof onSave === 'function') {
      onSave(payload);
    }

    setStatusMessage(saveAsTemplate ? 'Batch saved and template updated.' : 'Batch saved. Ingredient prices are locked to this snapshot.');
  };

  return (
    <div className="bg-surface rounded-3xl border border-ink/10 shadow-sm p-6 sm:p-8 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-brand">
            <Scale size={12} /> Live Mix Builder
          </div>
          <div>
            <h2 className="text-3xl font-black text-ink tracking-tight">Formulate feed by weight</h2>
            <p className="mt-2 text-sm text-ink-muted leading-6">
              Enter raw sack or kilogram weights and the builder will normalize percentages, calculate live batch cost, and snapshot ingredient prices when you save.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-[240px]">
          <SummaryCard icon={Scale} label="Total" value={metrics.totalWeight.toFixed(1)} unit="kg" />
          <SummaryCard icon={Coins} label="Cost" value={`KES ${metrics.totalCost.toFixed(0)}`} unit="batch" />
          <SummaryCard icon={BarChart3} label="Unit" value={`KES ${metrics.costPerKg.toFixed(2)}`} unit="per kg" />
        </div>
      </div>

      {/* Mix Type Selector */}
      <div className="rounded-2xl border border-ink/10 bg-surface-warm/70 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Mix Type</label>
            <div className="flex items-center gap-2 rounded-xl bg-surface p-1.5 border border-ink/10">
              <button
                type="button"
                onClick={() => handleMixTypeChange('concentrate')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${mixType === 'concentrate' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:bg-ink/5'}`}
              >
                <Zap size={16} /> Concentrate
              </button>
              <button
                type="button"
                onClick={() => handleMixTypeChange('tmr')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${mixType === 'tmr' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:bg-ink/5'}`}
              >
                <Wheat size={16} /> Main Meal (TMR)
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Protein Target (%)</label>
            <input
              type="number"
              value={proteinTarget}
              onChange={(e) => setProteinTarget(e.target.value)}
              placeholder="e.g. 16"
              className="w-full sm:w-32 rounded-xl border border-ink/10 bg-white p-3 text-center text-lg font-bold text-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="rounded-3xl border border-ink/10 bg-surface-warm/70 p-5 sm:p-6 shadow-[0_12px_24px_rgba(38,34,20,0.04)]">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-brand">
            <Copy size={12} /> Template quick load
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Use pre-saved template</label>
              <select
                value={activeTemplateId}
                onChange={(event) => handleLoadTemplate(event.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-white p-3 text-sm font-bold text-ink focus:border-brand focus:outline-none"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Formula / batch name</label>
              <input
                type="text"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Name this mix"
                className="w-full rounded-xl border border-ink/10 bg-white p-3 text-sm font-bold text-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(event) => setSaveAsTemplate(event.target.checked)}
                className="mt-1 h-5 w-5 rounded-md border-ink/20 text-brand focus:ring-brand accent-brand cursor-pointer"
              />
              <span>
                <span className="block text-sm font-bold text-ink">Save as reusable template</span>
                <span className="block text-xs text-ink-muted mt-1">Updates the selected template or creates a new one for future batches.</span>
              </span>
            </label>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand">
              <FolderHeart size={14} /> {saveAsTemplate ? (activeTemplateId ? 'Updating template' : 'Creating template') : 'Batch only'}
            </div>
          </div>

          {missingRows.length > 0 && (
            <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              Some template ingredients are missing from inventory. Replace them before saving to keep the analytics clean.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-brand/15 bg-brand/5 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-brand">
            <FolderHeart size={12} /> Template library
          </div>
          <div className="mt-3 space-y-3">
            {templates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-white/70 p-4 text-sm text-ink-muted">
                No saved templates yet. Build a mix and save it as a reusable template.
              </div>
            )}
            {templates.slice(0, 4).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleLoadTemplate(template.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  activeTemplateId === template.id
                    ? 'border-brand/30 bg-white text-brand'
                    : 'border-ink/10 bg-white/80 text-ink hover:border-brand/20 hover:bg-white'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{template.name}</span>
                  <span className="block text-[11px] text-ink-muted mt-1">{template.ingredients.length} ingredients</span>
                </span>
                <Copy size={14} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-8">
          <div className="rounded-3xl border border-ink/10 bg-surface-warm/70 p-5 sm:p-6 shadow-[0_12px_24px_rgba(38,34,20,0.04)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-brand">Composition</h3>
                <p className="text-xs text-ink-muted mt-1">The bar closes to 100% as the total batch weight grows.</p>
              </div>
              <span className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                {metrics.totalWeight > 0 ? '100%' : '0%'}
              </span>
            </div>

            <div className="relative h-6 overflow-hidden rounded-full border border-ink/10 bg-surface-raised">
              {metrics.totalWeight === 0 ? (
                <div className="flex h-full items-center justify-center text-[10px] font-black tracking-[0.3em] text-ink-muted">
                  Awaiting ingredients
                </div>
              ) : (
                <div className="flex h-full w-full">
                  {metrics.rows
                    .filter((row) => row.percentage > 0)
                    .map((row) => (
                      <div
                        key={row.id}
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: `${row.percentage}%`,
                          backgroundColor: row.item?.color || '#a8a29e',
                        }}
                        title={`${row.item?.name || 'Ingredient'} ${row.percentage.toFixed(1)}%`}
                      />
                    ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {activeRows.length > 0 ? (
                activeRows.map((row) => (
                  <div
                    key={row.id}
                    className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.item?.color || '#a8a29e' }} />
                    <span>{row.item?.name || row.ingredientId}: {row.percentage.toFixed(1)}%</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ink-muted">Add ingredients to see the mix composition.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-brand">Ingredient rows</h3>
                <p className="text-xs text-ink-muted mt-1">Type weights in kg; the system does the normalization.</p>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl border border-brand/15 bg-brand/5 px-3 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/10"
              >
                <Plus size={16} /> Add row
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-ink/10 bg-surface p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_180px_auto] md:items-end">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Ingredient</label>
                      <select
                        value={row.ingredientId}
                        onChange={(event) => updateRow(row.id, 'ingredientId', event.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-white p-3 text-sm font-bold text-ink focus:border-brand focus:outline-none"
                        disabled={isLoading}
                      >
                        <option value="">Select material...</option>
                        {row.ingredientId && !inventory.some((entry) => entry.id === row.ingredientId) && (
                          <option value={row.ingredientId}>
                            {row.ingredientName || row.ingredientId} (missing)
                          </option>
                        )}
                        {inventory.length === 0 && (
                          <option value="" disabled>
                            No inventory loaded
                          </option>
                        )}
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.costPerKg ? `(KES ${item.costPerKg}/kg)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Weight (kg)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.weight}
                          onChange={(event) => updateRow(row.id, 'weight', event.target.value)}
                          className="w-full rounded-xl border border-ink/10 bg-white p-3 pr-12 text-sm font-bold text-ink focus:border-brand focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0.0"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold uppercase tracking-wider text-ink-muted">
                          kg
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-ink/10 px-3 text-ink-muted transition-colors hover:border-danger/20 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Remove ingredient row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {row.item && row.weight > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-surface-warm px-3 py-2 text-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Share</div>
                        <div className="mt-1 font-black text-brand">{row.percentage.toFixed(1)}%</div>
                      </div>
                      <div className="rounded-xl bg-surface-warm px-3 py-2 text-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Row cost</div>
                        <div className="mt-1 font-black text-brand">KES {row.cost.toFixed(0)}</div>
                      </div>
                      <div className="rounded-xl bg-surface-warm px-3 py-2 text-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Locked price</div>
                        <div className="mt-1 font-black text-brand">KES {row.costPerKg.toFixed(2)}/kg</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-surface transition-colors hover:bg-brand-dark"
              >
                <Save size={16} /> Save batch snapshot
              </button>
              {statusMessage && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm font-medium text-brand">
                  <CheckCircle2 size={16} /> {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-surface p-5 shadow-sm">
            <h3 className="text-lg font-bold text-brand">Snapshot summary</h3>
            <p className="mt-2 text-sm text-ink-muted leading-6">
              Saved batches carry a locked price so future ROI calculations stay historically accurate even if ingredient prices change.
            </p>
            <div className="mt-4 space-y-3">
              {history.length > 0 ? (
                history.map((batch) => (
                  <div key={batch.id} className="rounded-2xl border border-ink/10 bg-surface-warm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-brand">Batch snapshot</div>
                        <div className="mt-1 text-xs text-ink-muted">{new Date(batch.savedAt).toLocaleString()}</div>
                      </div>
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
                        KES {batch.costPerKg.toFixed(2)}/kg
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Weight</div>
                        <div className="mt-1 font-black text-ink">{batch.totalWeight.toFixed(1)} kg</div>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cost</div>
                        <div className="mt-1 font-black text-ink">KES {batch.totalCost.toFixed(0)}</div>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Items</div>
                        <div className="mt-1 font-black text-ink">{batch.ingredients.length}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-ink/15 bg-surface-warm/50 p-5 text-sm text-ink-muted">
                  No saved batch yet. Save your first formula snapshot to start building analytics history.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-brand/15 bg-brand/5 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-brand">How it behaves</h3>
            <ul className="mt-3 space-y-3 text-sm text-ink-muted leading-6">
              <li>Raw weights are normalized automatically to 100%.</li>
              <li>Ingredient price is snapshotted at save time for accurate historical ROI.</li>
              <li>Templates can be loaded, updated, or saved as reusable defaults.</li>
              <li>Batch cost updates instantly as the farmer types.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
