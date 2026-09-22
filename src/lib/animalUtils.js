/**
 * @file Utility functions for processing and normalizing animal record data.
 */

import { formatDateTime } from './audit';
import { resolveBackendAssetUrl } from './apiClient';
import { formatCowIdentity, normalizeCowIdentity } from './cowIdentity';

export function getAvatarLabel(animal) {
  const nameInitial = animal?.name?.trim()?.charAt(0)?.toUpperCase();
  const idInitial = animal?.id?.trim()?.charAt(0)?.toUpperCase();
  return nameInitial || idInitial || 'C';
}

export function getTimelineTheme(type) {
  if (type === 'Health') {
    return {
      badgeClass: 'text-danger bg-danger/10 border-danger/20',
      cardClass: 'border-l-danger bg-danger/5 border-danger/15',
    };
  }

  if (type === 'Breeding') {
    return {
      badgeClass: 'text-brand bg-brand/10 border-brand/20',
      cardClass: 'border-l-brand bg-brand/5 border-brand/15',
    };
  }

  return {
    badgeClass: 'text-accent-dark bg-accent/10 border-accent/20',
    cardClass: 'border-l-accent bg-accent/5 border-accent/15',
  };
}

export function normalizeTimelineEvent(entry = {}, animalId = '') {
  const eventType = entry.event_type ?? entry.type ?? 'general';
  const normalizedType = `${eventType}`.trim().toLowerCase();
  const displayType = normalizedType === 'health' ? 'Health' : normalizedType === 'breeding' ? 'Breeding' : 'General';

  return {
    id: entry.id ?? `${animalId}-${entry.created_at ?? entry.event_date ?? Date.now()}`,
    cowId: entry.cow_id ?? entry.cowId ?? animalId,
    tenantId: entry.tenant_id ?? entry.tenantId ?? null,
    type: displayType,
    title: entry.title ?? `${displayType} event`,
    description: entry.description ?? 'No additional details provided.',
    date: formatDateTime(entry.event_date ?? entry.created_at ?? entry.createdAt ?? new Date().toISOString()),
    rawDate: entry.event_date ?? entry.created_at ?? entry.createdAt ?? null,
    eventData: entry.event_data ?? entry.eventData ?? null,
    createdBy: entry.created_by ?? entry.createdBy ?? null,
    createdAt: entry.created_at ?? entry.createdAt ?? null,
    iconKey: normalizedType,
  };
}

export function normalizeTimelineResponse(response, animalId = '') {
  const items = Array.isArray(response?.items) ? response.items : [];
  const meta = response?.meta ?? { page: 1, per_page: items.length || 20, total: items.length, pages: 1 };

  return {
    items: items.map((item) => normalizeTimelineEvent(item, animalId)),
    meta,
  };
}

function formatParentReference(parent, fallbackName, fallbackId) {
  if (parent && typeof parent === 'object') {
    const tag = parent.tag_number ?? parent.tag ?? parent.ear_tag ?? parent.id;
    const name = parent.name ?? parent.cow_name;

    return formatCowIdentity({ name, earTag: tag }, '--');
  }

  return parent ?? fallbackName ?? (fallbackId ? `ID ${fallbackId}` : '--');
}

export function normalizeAnimal(animal = {}, id = '') {
  const identity = normalizeCowIdentity({ ...animal, id: animal.id ?? animal.cow_id ?? id });
  const ageMonths = Number(animal.ageMonths ?? animal.age_months ?? 0);
  const yesterdayYieldLiters = Number(
    animal.yesterdayYieldLiters ?? animal.yesterday_yield_liters ?? 0
  );
  const sevenDayAverageLiters = Number(
    animal.sevenDayAverageLiters ?? animal.seven_day_average_liters ?? 0
  );
  return {
    id: identity.recordId || identity.earTag || id,
    recordId: identity.recordId || id,
    earTag: identity.earTag,
    name: identity.name || 'Unnamed',
    breed: animal.breed ?? animal.breed_name ?? 'Unknown',
    sire: formatParentReference(animal.sire, animal.sire_name, animal.sire_id),
    dam: formatParentReference(animal.dam, animal.dam_name, animal.dam_id),
    birthWeightKg: animal.birth_weight_kg ?? animal.birthWeightKg ?? animal.birth_weight ?? null,
    ageMonths,
    status: animal.status ?? animal.current_status ?? animal.currentStatus ?? animal.lactation_status ?? 'Cow',
    current_status: animal.current_status ?? animal.currentStatus ?? animal.status ?? animal.lactation_status ?? 'Cow',
    lastCalved: animal.lastCalved ?? animal.last_calved ?? null,
    milk: `${yesterdayYieldLiters.toFixed(1)} L/day`,
    yesterdayYield: `${yesterdayYieldLiters.toFixed(1)} L`,
    sevenDayAvg: `${sevenDayAverageLiters.toFixed(1)} L`,
    yesterdayYieldLiters,
    sevenDayAverageLiters,
    // Backend-computed (CowStatusService) — trust these, don't re-derive client-side.
    pregnancyStatus: animal.pregnancyStatus ?? animal.pregnancy_status ?? 'Unknown',
    daysInMilk: animal.daysInMilk ?? animal.days_in_milk ?? null,
    daysOpen: animal.daysOpen ?? animal.days_open ?? null,
    photoUrl: resolveBackendAssetUrl(animal.photoUrl ?? animal.photo_url),
  };
}