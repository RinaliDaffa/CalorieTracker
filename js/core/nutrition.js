/* ============================================
   NutriSnap — Nutrition Validation
   Pure. No DOM. Guards storage against implausible model output:
   one hallucinated number would poison every total and trend.
   ============================================ */

export const LIMITS = {
  itemCalories:   { min: 0, max: 5000 },
  itemMacroGrams: { min: 0, max: 500 },
  mealCalories:   { min: 0, max: 10000 },
  healthScore:    { min: 1, max: 10 }
};

// Beyond this relative gap, stated calories and 4P+4C+9F are treated
// as disagreeing. Fibre and alcohol make the identity inexact, so this
// is a confidence signal only - never a rejection.
const MACRO_MISMATCH_TOLERANCE = 0.3;

const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function caloriesFromMacros(protein, carbs, fat) {
  return (protein * 4) + (carbs * 4) + (fat * 9);
}

/**
 * Validate and sanitise a raw analysis object from the model.
 * Returns { ok, value, errors, warnings }.
 * On ok:false, `value` is undefined and the caller must not save.
 */
export function validateAnalysis(raw) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Analysis was empty.'], warnings };
  }
  if (!Array.isArray(raw.foodItems) || raw.foodItems.length === 0) {
    return { ok: false, errors: ['No food items were identified.'], warnings };
  }

  const foodItems = [];

  for (const [index, item] of raw.foodItems.entries()) {
    const label = `Item ${index + 1}`;

    if (!item || typeof item !== 'object') {
      errors.push(`${label} was malformed.`);
      continue;
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) {
      errors.push(`${label} had no name.`);
      continue;
    }

    if (!isFiniteNumber(item.calories)) {
      errors.push(`${name} had an unreadable calorie value.`);
      continue;
    }
    if (item.calories < LIMITS.itemCalories.min ||
        item.calories > LIMITS.itemCalories.max) {
      errors.push(
        `${name} reported ${Math.round(item.calories)} kcal, which is outside ` +
        `the plausible range (${LIMITS.itemCalories.min}-${LIMITS.itemCalories.max}).`
      );
      continue;
    }

    const clean = {
      name,
      servingSize: typeof item.servingSize === 'string' ? item.servingSize : '',
      calories: item.calories
    };

    let macroFault = false;
    for (const key of MACRO_KEYS) {
      const value = item[key];
      if (value === undefined || value === null) {
        clean[key] = 0;
        continue;
      }
      if (!isFiniteNumber(value)) {
        errors.push(`${name} had an unreadable ${key} value.`);
        macroFault = true;
        break;
      }
      clean[key] = clamp(
        value, LIMITS.itemMacroGrams.min, LIMITS.itemMacroGrams.max
      );
    }
    if (macroFault) continue;

    const implied = caloriesFromMacros(clean.protein, clean.carbs, clean.fat);
    const gap = Math.abs(clean.calories - implied) / Math.max(clean.calories, 1);
    if (gap > MACRO_MISMATCH_TOLERANCE) {
      warnings.push(
        `${name}: stated calories and macros disagree - worth checking.`
      );
    }

    foodItems.push(clean);
  }

  if (foodItems.length === 0) {
    if (errors.length === 0) errors.push('No usable food items were returned.');
    return { ok: false, errors, warnings };
  }

  // Totals are recomputed rather than trusted: the model frequently
  // returns a sum that does not match its own items.
  const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
  for (const item of foodItems) {
    totalNutrition.calories += item.calories;
    for (const key of MACRO_KEYS) totalNutrition[key] += item[key];
  }

  if (totalNutrition.calories > LIMITS.mealCalories.max) {
    errors.push(
      `The meal totalled ${Math.round(totalNutrition.calories)} kcal, ` +
      `above the ${LIMITS.mealCalories.max} kcal limit for a single meal.`
    );
    return { ok: false, errors, warnings };
  }

  const healthScore = isFiniteNumber(raw.healthScore)
    ? Math.round(clamp(raw.healthScore, LIMITS.healthScore.min, LIMITS.healthScore.max))
    : null;

  return {
    ok: true,
    errors: [],
    warnings,
    value: {
      foodItems,
      totalNutrition,
      healthScore,
      aiTips: typeof raw.aiTips === 'string' ? raw.aiTips : '',
      mealDescription: typeof raw.mealDescription === 'string' ? raw.mealDescription : ''
    }
  };
}
