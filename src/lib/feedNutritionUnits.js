export function proteinInputToGramsPerKg(value, unit = 'g_per_kg') {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return unit === 'percent' ? numericValue * 10 : numericValue;
}

export function proteinGramsPerKgToInput(value, unit = 'g_per_kg') {
  const gramsPerKg = Number(value);
  if (!Number.isFinite(gramsPerKg) || gramsPerKg < 0) {
    return 0;
  }
  return unit === 'percent' ? gramsPerKg / 10 : gramsPerKg;
}
