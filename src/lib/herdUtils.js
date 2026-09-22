import { normalizeCowIdentity } from './cowIdentity';

/**
 * @file Utility functions for processing and normalizing herd registry data.
 */

import { formatDateTime, getRelativeTime } from './audit';

export function formatAge(ageMonths) {
  if (typeof ageMonths !== 'number' || !Number.isFinite(ageMonths)) return 'N/A';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return `${years}y ${months}m`;
}

export function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function normalizeStatusValue(status = '') {
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function isMilkingStatus(status = '') {
  const normalized = normalizeStatusValue(status);
  return ['milking', 'lactating', 'in milk'].includes(normalized);
}

export function isDryStatus(status = '') {
  const normalized = normalizeStatusValue(status);
  return ['dry', 'dry off', 'dry cow', 'non lactating'].includes(normalized);
}

export function statusTone(status) {
  if (isMilkingStatus(status)) return 'bg-accent/20 text-brand-dark border-accent/30';
  if (isDryStatus(status)) return 'bg-ink/10 text-ink-muted border-ink/15';
  if (status === 'Calf') return 'bg-accent/10 text-accent-dark border-accent/20';
  if (status === 'Heifer') return 'bg-surface-raised text-ink border-ink/10';
  if (status === 'Cow') return 'bg-accent/20 text-brand-dark border-accent/30';
  return 'bg-surface-raised text-ink border-ink/10';
}

function matchesStatusFilter(status = '', filter = 'All') {
  if (filter === 'All') return true;
  if (filter === 'Milking') return isMilkingStatus(status);
  if (filter === 'Dry') return isDryStatus(status);
  return String(status) === filter;
}

export function hasValidTimestamp(timestamp) {
  if (!timestamp) return false;
  const parsedDate = new Date(timestamp);
  return !Number.isNaN(parsedDate.getTime());
}

export function normalizeEarTag(value = '') {
  return String(value ?? '').trim().toUpperCase();
}

function getRelatedRecordId(value) {
  if (value && typeof value === 'object') {
    return value.id ?? value.cow_id ?? value.animal_id ?? '';
  }

  return value ?? '';
}

function getRelatedRecordName(value) {
  if (value && typeof value === 'object') {
    return value.name ?? value.sire_name ?? value.bull_name ?? value.code ?? value.bull_code ?? '';
  }

  return value ?? '';
}

export function normalizeHerdCow(cow = {}, fallback = {}) {
  const identity = normalizeCowIdentity({ ...fallback, ...cow });
  const ageMonths = Number(cow.ageMonths ?? cow.age_months ?? fallback.ageMonths ?? 0);
  const status = cow.current_status ?? cow.currentStatus ?? cow.status ?? cow.lactation_status ?? fallback.status ?? 'Cow';
  const displayId = identity.earTag || identity.recordId;
  const recordId = identity.recordId || identity.earTag;
  const dateOfBirth = cow.dateOfBirth ?? cow.date_of_birth ?? cow.dob ?? fallback.dateOfBirth ?? '';
  const damId = getRelatedRecordId(cow.dam_id ?? cow.damId ?? cow.dam ?? fallback.dam_id ?? fallback.damId ?? fallback.dam);
  const sireName = getRelatedRecordName(cow.sire_name ?? cow.sireName ?? cow.sire ?? fallback.sire_name ?? fallback.sireName ?? fallback.sire);
  const birthWeightKg = cow.birth_weight_kg ?? cow.birthWeightKg ?? cow.birth_weight ?? fallback.birth_weight_kg ?? fallback.birthWeightKg ?? fallback.birth_weight ?? '';
  const hasPhotoField = Object.prototype.hasOwnProperty.call(cow, 'photoUrl')
    || Object.prototype.hasOwnProperty.call(cow, 'photo_url');
  const photoUrl = hasPhotoField
    ? cow.photoUrl ?? cow.photo_url ?? null
    : fallback.photoUrl ?? fallback.photo_url ?? null;

  return {
    id: String(displayId ?? '').trim(),
    recordId: String(recordId ?? '').trim(),
    name: identity.name || 'Unnamed',
    breed: cow.breed ?? cow.breed_status ?? cow.breed_name ?? fallback.breed ?? 'Foundation',
    ageMonths,
    status,
    dateOfBirth,
    sire_name: String(sireName ?? ''),
    dam_id: damId === '' || damId === null || damId === undefined ? '' : String(damId),
    birth_weight_kg: birthWeightKg === null || birthWeightKg === undefined ? '' : String(birthWeightKg),
    lastCalved: cow.lastCalved ?? cow.last_calved ?? fallback.lastCalved ?? null,
    milk: cow.milk ?? cow.daily_milk ?? fallback.milk ?? '0.0 L/day',
    createdAt: cow.createdAt ?? cow.created_at ?? fallback.createdAt ?? new Date().toISOString(),
    updatedAt: cow.updatedAt ?? cow.updated_at ?? fallback.updatedAt ?? null,
    updatedBy: cow.updatedBy ?? cow.updated_by ?? fallback.updatedBy ?? 'You',
    photoUrl,
  };
}

export function getFilteredHerd(herd, statusFilter, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return herd
    .filter((cow) => matchesStatusFilter(cow.status, statusFilter))
    .filter((cow) => {
      if (!normalizedSearch) return true;
      return [cow.id, cow.name, cow.breed, cow.status].some((field) =>
        String(field).toLowerCase().includes(normalizedSearch)
      );
    })
    .slice()
    .sort((a, b) => {
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    });
}

export function getHerdSummary(herd) {
  const totalAnimals = herd.length;
  const milkingCount = herd.filter((cow) => isMilkingStatus(cow.status)).length;
  const dryCount = herd.filter((cow) => isDryStatus(cow.status)).length;
  const averageAgeMonths =
    totalAnimals === 0
      ? 0
      : Math.round(
        herd.reduce((sum, cow) => sum + (cow.ageMonths || 0), 0) / totalAnimals
      );
  const latestCalved = herd
    .map((cow) => cow.lastCalved)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  const latestUpdatedAt = herd
    .map((cow) => cow.updatedAt)
    .filter(hasValidTimestamp)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    totalAnimals,
    milkingCount,
    dryCount,
    averageAgeMonths,
    latestCalved,
    latestUpdatedAt,
  };
}