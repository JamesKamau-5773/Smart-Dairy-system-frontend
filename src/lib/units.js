// Farm measurement units ("unit helpers"), as the backend stores them: one local unit for a
// stock item and how many kilograms it holds (GET /units/conversions, normalized by
// `normalizeUnitConversion`: { id, itemId, unitName, kgEquivalent }). Pure functions: the
// conversions are passed in (see useUnitConversions); nothing is read from the phone.

/** The conversion for a stock item, or null. Item ids are compared as strings. */
export function findConversionForItem(conversions, itemId) {
  if (!Array.isArray(conversions) || itemId === null || itemId === undefined || itemId === '') return null;
  return conversions.find((conversion) => String(conversion.itemId) === String(itemId)) ?? null;
}

const roundForDisplay = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : String(rounded);
};

/**
 * Kilograms of a stock item in the farm's local unit, e.g. 4 kg of dairy meal → "2 kasuku".
 * @returns {{ value: string|number, unit: string, wasConverted: boolean }} The kilograms
 *   unchanged (`unit: 'kg'`) when the item has no unit helper.
 */
export function convertKgToLocal(conversions, itemId, kg) {
  const conversion = findConversionForItem(conversions, itemId);
  if (!conversion || !(Number(conversion.kgEquivalent) > 0) || !Number.isFinite(Number(kg))) {
    return { value: kg, unit: 'kg', wasConverted: false };
  }
  return { value: roundForDisplay(Number(kg) / Number(conversion.kgEquivalent)), unit: conversion.unitName, wasConverted: true };
}

/** A local-unit amount back to kilograms (for sending to the backend); unchanged without a helper. */
export function convertLocalToKg(conversions, itemId, localAmount) {
  const conversion = findConversionForItem(conversions, itemId);
  if (!conversion || !(Number(conversion.kgEquivalent) > 0)) return Number(localAmount || 0);
  return Number(localAmount) * Number(conversion.kgEquivalent);
}

const LEGACY_STORAGE_KEY = 'unit_conversions';

/** @deprecated Phone-only copy used by the unrouted pages/settings/UnitConversions.jsx (Phase 7 removes both). */
export function getAllConversions() {
  try {
    const stored = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

/** @deprecated See getAllConversions. */
export function saveAllConversions(conversions) {
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(conversions));
  } catch {
    // ignore
  }
}
