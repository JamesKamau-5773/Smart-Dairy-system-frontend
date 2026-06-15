// Simple farm unit conversion utilities backed by localStorage when backend is not present.
const STORAGE_KEY = 'unit_conversions';
const DEFAULT_CONVERSIONS = [
  {
    id: 'default-dairy-meal-kasuku',
    context: 'Dairy Meal',
    unitName: 'Kasukus',
    baseUnit: 'kg',
    factor: 2,
  },
];

export function getAllConversions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_CONVERSIONS;
  } catch {
    return DEFAULT_CONVERSIONS;
  }
}

export function saveAllConversions(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function findConversionForContext(context) {
  if (!context) return null;
  const normalized = String(context).toLowerCase();
  const all = getAllConversions();
  return all.find((c) => String(c.context || '').toLowerCase() === normalized) || null;
}

// Convert kilograms to local unit for a given context (e.g., 'Dairy Meal')
// Conversion record: { id, context, unitName, baseUnit, factor }
export function convertKgToLocal(context, kg) {
  const conv = findConversionForContext(context);
  if (!conv || !conv.factor || (conv.baseUnit || '').toLowerCase() !== 'kg') {
    return { value: kg, unit: 'kg', wasConverted: false };
  }

  const localValue = kg / Number(conv.factor);
  // Round to 2 decimals, but if whole number show as integer
  const rounded = Math.round(localValue * 100) / 100;
  const display = Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : String(rounded);
  return { value: display, unit: conv.unitName, wasConverted: true };
}

// Convert a local unit amount back to kg for sending to backend
export function convertLocalToKg(context, localAmount) {
  const conv = findConversionForContext(context);
  if (!conv || !conv.factor || (conv.baseUnit || '').toLowerCase() !== 'kg') {
    return Number(localAmount || 0);
  }
  return Number(localAmount) * Number(conv.factor);
}

export default { getAllConversions, saveAllConversions, findConversionForContext, convertKgToLocal, convertLocalToKg };
