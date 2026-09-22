export const CALF_FEED_TYPE = 'CALF_FEED';

export function todayLocalIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function isActiveCalf(animal = {}) {
  const status = String(animal.current_status ?? animal.currentStatus ?? animal.status ?? '')
    .trim()
    .toLowerCase();
  const isActive = animal.is_active ?? animal.isActive ?? true;
  return status === 'calf' && isActive !== false;
}

export function buildCalfMilkFeedPayload(values = {}) {
  return {
    type: CALF_FEED_TYPE,
    calf_id: Number(values.calfId),
    liters: Number(values.liters),
    date: values.date,
    notes: String(values.notes ?? '').trim(),
  };
}

export function validateCalfMilkFeed(values = {}) {
  if (!values.calfId) return 'Select a calf.';
  if (!Number.isFinite(Number(values.liters)) || Number(values.liters) <= 0) return 'Enter a milk amount greater than zero.';
  if (!values.date) return 'Select a feeding date.';
  if (values.date > todayLocalIso()) return 'Feeding date cannot be in the future.';
  return '';
}

export function normalizeMilkDisposition(record = {}) {
  const calf = record.calf ?? {};
  return {
    ...record,
    id: record.id ?? record.disposition_id ?? record.dispositionId ?? null,
    type: record.type ?? record.disposition_type ?? CALF_FEED_TYPE,
    date: record.date ?? record.disposition_date ?? null,
    liters: Number(record.liters ?? record.amount ?? 0),
    calfId: record.calf_id ?? record.calfId ?? calf.id ?? null,
    calfName: calf.name ?? record.calf_name ?? record.calfName ?? '',
    calfTag: calf.tag_number ?? calf.tagNumber ?? record.calf_tag ?? record.calfTag ?? '',
    notes: record.notes ?? '',
    recordedBy: record.recorded_by ?? record.recordedBy ?? null,
    createdAt: record.created_at ?? record.createdAt ?? null,
  };
}

export function filterMilkDispositions(records = [], filters = {}) {
  const calfId = String(filters.calfId ?? '');
  return records.filter((record) => {
    const matchesCalf = !calfId || String(record.calfId) === calfId;
    const matchesFrom = !filters.from || record.date >= filters.from;
    const matchesTo = !filters.to || record.date <= filters.to;
    return matchesCalf && matchesFrom && matchesTo;
  });
}

export function summarizeMilkDispositions(records = [], today = todayLocalIso()) {
  const monthPrefix = today.slice(0, 7);
  const totalLiters = (items) => items.reduce((total, record) => total + Number(record.liters || 0), 0);
  return {
    todayLiters: totalLiters(records.filter((record) => record.date === today)),
    monthLiters: totalLiters(records.filter((record) => String(record.date).startsWith(monthPrefix))),
    calfCount: new Set(records.map((record) => record.calfId).filter(Boolean)).size,
    recordCount: records.length,
  };
}

export function summarizeConsumptionByCalf(records = []) {
  const totals = new Map();
  records.forEach((record) => {
    const key = String(record.calfId ?? 'unknown');
    const current = totals.get(key) ?? {
      calfId: record.calfId,
      calfName: record.calfName,
      calfTag: record.calfTag,
      liters: 0,
      feedings: 0,
    };
    current.liters += Number(record.liters || 0);
    current.feedings += 1;
    totals.set(key, current);
  });
  return Array.from(totals.values()).sort((a, b) => b.liters - a.liters);
}