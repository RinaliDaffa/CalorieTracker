import { type FoodItem, NUTRIENT_KEYS, type Nutrients } from './types';

export const LIMITS = {
  itemCalories: { min: 0, max: 5000 },
  itemMacroGrams: { min: 0, max: 500 },
  mealCalories: { min: 0, max: 10000 },
  healthScore: { min: 1, max: 10 },
} as const;

// Beyond this relative gap, stated calories and 4P+4C+9F are treated as
// disagreeing. Fibre and alcohol make the identity inexact, so this is a
// confidence signal only - never a rejection.
const MACRO_MISMATCH_TOLERANCE = 0.3;

const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'] as const;

export interface AnalyzedItem extends Nutrients {
  name: string;
  servingSize: string;
}

export interface Analysis {
  foodItems: AnalyzedItem[];
  totalNutrition: Nutrients;
  healthScore: number | null;
  aiTips: string;
  mealDescription: string;
}

export type ValidationResult =
  | { ok: true; value: Analysis; errors: []; warnings: string[] }
  | { ok: false; value?: undefined; errors: string[]; warnings: string[] };

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function zeroNutrients(): Nutrients {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = zeroNutrients();
  for (const key of NUTRIENT_KEYS) out[key] = a[key] + b[key];
  return out;
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = zeroNutrients();
  for (const key of NUTRIENT_KEYS) out[key] = n[key] * factor;
  return out;
}

export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  return list.reduce<Nutrients>((acc, n) => addNutrients(acc, n), zeroNutrients());
}

/** What an item contributes after how much of it was actually eaten. */
export function itemTotals(item: FoodItem): Nutrients {
  return scaleNutrients(item.nutrition, item.eatenFraction);
}

export function mealTotals(items: readonly FoodItem[]): Nutrients {
  return sumNutrients(items.map(itemTotals));
}

function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/**
 * Validate and sanitise raw model output. On ok:false `value` is undefined and
 * the caller must not save: one hallucinated number would poison every total.
 */
export function validateAnalysis(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Analysis was empty.'], warnings };
  }
  const input = raw as Record<string, unknown>;
  const rawItems = input.foodItems;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, errors: ['No food items were identified.'], warnings };
  }

  const foodItems: AnalyzedItem[] = [];

  for (const [index, entry] of rawItems.entries()) {
    const label = `Item ${index + 1}`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${label} was malformed.`);
      continue;
    }
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) {
      errors.push(`${label} had no name.`);
      continue;
    }
    const calories = item.calories;
    if (!isFiniteNumber(calories)) {
      errors.push(`${name} had an unreadable calorie value.`);
      continue;
    }
    if (calories < LIMITS.itemCalories.min || calories > LIMITS.itemCalories.max) {
      errors.push(
        `${name} reported ${Math.round(calories)} kcal, which is outside the plausible range ` +
          `(${LIMITS.itemCalories.min}-${LIMITS.itemCalories.max}).`,
      );
      continue;
    }

    const macros = { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
    let macroFault = false;
    for (const key of MACRO_KEYS) {
      const value = item[key];
      if (value === undefined || value === null) continue;
      if (!isFiniteNumber(value)) {
        errors.push(`${name} had an unreadable ${key} value.`);
        macroFault = true;
        break;
      }
      macros[key] = clamp(value, LIMITS.itemMacroGrams.min, LIMITS.itemMacroGrams.max);
    }
    if (macroFault) continue;

    const implied = caloriesFromMacros(macros.protein, macros.carbs, macros.fat);
    const gap = Math.abs(calories - implied) / Math.max(calories, 1);
    if (gap > MACRO_MISMATCH_TOLERANCE) {
      warnings.push(`${name}: stated calories and macros disagree - worth checking.`);
    }

    foodItems.push({
      name,
      servingSize: typeof item.servingSize === 'string' ? item.servingSize : '',
      calories,
      ...macros,
    });
  }

  if (foodItems.length === 0) {
    if (errors.length === 0) errors.push('No usable food items were returned.');
    return { ok: false, errors, warnings };
  }

  // A dropped item is a silent undercount, which is worse than a mismatch
  // warning - so it must surface.
  if (foodItems.length < rawItems.length) {
    warnings.push(
      `${rawItems.length - foodItems.length} item(s) could not be read and were left out of this meal.`,
    );
  }

  // Totals are recomputed rather than trusted: the model frequently returns a
  // sum that does not match its own items.
  const totalNutrition = sumNutrients(foodItems);

  if (totalNutrition.calories > LIMITS.mealCalories.max) {
    errors.push(
      `The meal totalled ${Math.round(totalNutrition.calories)} kcal, above the ` +
        `${LIMITS.mealCalories.max} kcal limit for a single meal.`,
    );
    return { ok: false, errors, warnings };
  }

  const healthScore = isFiniteNumber(input.healthScore)
    ? Math.round(clamp(input.healthScore, LIMITS.healthScore.min, LIMITS.healthScore.max))
    : null;

  return {
    ok: true,
    errors: [],
    warnings,
    value: {
      foodItems,
      totalNutrition,
      healthScore,
      aiTips: typeof input.aiTips === 'string' ? input.aiTips : '',
      mealDescription: typeof input.mealDescription === 'string' ? input.mealDescription : '',
    },
  };
}

/** SP0 model output is per-item totals with free-text serving sizes. */
export function analysisToItems(analysis: Analysis): FoodItem[] {
  return analysis.foodItems.map((item) => ({
    name: item.name,
    portion: { unit: 'serving', count: 1 },
    ...(item.servingSize ? { servingText: item.servingSize } : {}),
    eatenFraction: 1,
    nutrition: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sugar: item.sugar,
    },
    source: 'ai',
  }));
}
