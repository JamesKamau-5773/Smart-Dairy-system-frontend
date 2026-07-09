const INGREDIENT_ALIASES = {
  napier: 'napier grass',
  'elephant grass': 'napier grass',
  'maize stover': 'dry maize stalks',
  'maize stalks': 'dry maize stalks',
  'corn stover': 'dry maize stalks',
};

const INGREDIENT_STANDARDS = {
  hay: { proteinGramsPerKg: 110, energyMjPerKg: 8.5, fiberGramsPerKg: 320, costPerKg: 18 },
  'napier grass': { proteinGramsPerKg: 95, energyMjPerKg: 8.0, fiberGramsPerKg: 300, costPerKg: 8 },
  silage: { proteinGramsPerKg: 80, energyMjPerKg: 9.5, fiberGramsPerKg: 280, costPerKg: 12 },
  'dry maize stalks': { proteinGramsPerKg: 45, energyMjPerKg: 6.5, fiberGramsPerKg: 380, costPerKg: 5 },
};

const CATEGORY_BASELINES = {
  'bulk feed': { proteinGramsPerKg: 70, energyMjPerKg: 7.5, fiberGramsPerKg: 250, costPerKg: 10 },
};

const normalizeName = (name) => String(name || '').trim().toLowerCase();

export const resolveIngredientStandards = ({ name, category }) => {
  const normalizedName = normalizeName(name);
  const canonicalName = INGREDIENT_ALIASES[normalizedName] || normalizedName;

  if (INGREDIENT_STANDARDS[canonicalName]) {
    return {
      values: INGREDIENT_STANDARDS[canonicalName],
      source: `ingredient:${canonicalName}`,
    };
  }

  const normalizedCategory = normalizeName(category);
  if (CATEGORY_BASELINES[normalizedCategory]) {
    return {
      values: CATEGORY_BASELINES[normalizedCategory],
      source: `category:${normalizedCategory}`,
    };
  }

  return null;
};

export const areNutritionAndCostAllZero = (payload) => {
  const protein = Number(payload?.proteinGramsPerKg ?? payload?.protein_grams_per_kg ?? 0);
  const energy = Number(payload?.energyMjPerKg ?? payload?.energy_mj_per_kg ?? 0);
  const fiber = Number(payload?.fiberGramsPerKg ?? payload?.fiber_grams_per_kg ?? 0);
  const cost = Number(payload?.costPerKg ?? payload?.cost_per_kg ?? 0);

  return protein <= 0 && energy <= 0 && fiber <= 0 && cost <= 0;
};
