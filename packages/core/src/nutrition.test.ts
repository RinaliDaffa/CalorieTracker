import { describe, expect, test } from 'vitest';
import {
  analysisToItems,
  LIMITS,
  mealTotals,
  scaleNutrients,
  sumNutrients,
  validateAnalysis,
} from './nutrition';
import type { FoodItem } from './types';

function validAnalysis(): Record<string, unknown> & { foodItems: Record<string, unknown>[] } {
  return {
    foodItems: [
      {
        name: 'Nasi Goreng',
        servingSize: '1 porsi',
        calories: 600,
        protein: 20,
        carbs: 80,
        fat: 22,
        fiber: 3,
        sugar: 5,
      },
    ],
    totalNutrition: { calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 },
    healthScore: 6,
    aiTips: 'Add vegetables.',
    mealDescription: 'Fried rice',
  };
}

describe('validateAnalysis', () => {
  test('accepts a well-formed analysis unchanged', () => {
    const result = validateAnalysis(validAnalysis());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.value?.foodItems[0]?.calories).toBe(600);
  });

  test('rejects an implausible calorie count', () => {
    const bad = validAnalysis();
    bad.foodItems[0] = { ...bad.foodItems[0], calories: 47000 };
    const result = validateAnalysis(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects negative calories', () => {
    const bad = validAnalysis();
    bad.foodItems[0] = { ...bad.foodItems[0], calories: -50 };
    expect(validateAnalysis(bad).ok).toBe(false);
  });

  test('rejects non-finite numbers', () => {
    const inf = validAnalysis();
    inf.foodItems[0] = { ...inf.foodItems[0], calories: Number.POSITIVE_INFINITY };
    expect(validateAnalysis(inf).ok).toBe(false);

    const nan = validAnalysis();
    nan.foodItems[0] = { ...nan.foodItems[0], protein: Number.NaN };
    expect(validateAnalysis(nan).ok).toBe(false);
  });

  test('clamps an out-of-range macro rather than rejecting', () => {
    const bad = validAnalysis();
    bad.foodItems[0] = { ...bad.foodItems[0], protein: 900 };
    const result = validateAnalysis(bad);
    expect(result.ok).toBe(true);
    expect(result.value?.foodItems[0]?.protein).toBe(LIMITS.itemMacroGrams.max);
  });

  test('rejects a missing or empty food list', () => {
    expect(validateAnalysis({}).ok).toBe(false);
    expect(validateAnalysis({ foodItems: [] }).ok).toBe(false);
    expect(validateAnalysis(null).ok).toBe(false);
  });

  test('rejects an item with no name', () => {
    const bad = validAnalysis();
    bad.foodItems[0] = { ...bad.foodItems[0], name: '' };
    expect(validateAnalysis(bad).ok).toBe(false);
  });

  test('defaults missing optional macros to zero', () => {
    const partial = validAnalysis();
    const { fiber: _f, sugar: _s, ...rest } = partial.foodItems[0] as Record<string, unknown>;
    partial.foodItems[0] = rest;
    const result = validateAnalysis(partial);
    expect(result.ok).toBe(true);
    expect(result.value?.foodItems[0]?.fiber).toBe(0);
  });

  test('recomputes totals from items rather than trusting the model', () => {
    const bad = validAnalysis();
    bad.totalNutrition = { calories: 99, protein: 0, carbs: 0, fat: 0 };
    const result = validateAnalysis(bad);
    expect(result.value?.totalNutrition.calories).toBe(600);
  });

  test('warns but still saves when macros disagree with calories', () => {
    const odd = validAnalysis();
    odd.foodItems[0] = { ...odd.foodItems[0], protein: 5, carbs: 5, fat: 1 };
    const result = validateAnalysis(odd);
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('does not warn when macros agree with calories', () => {
    expect(validateAnalysis(validAnalysis()).warnings).toEqual([]);
  });

  test('clamps healthScore into 1-10', () => {
    const bad = validAnalysis();
    bad.healthScore = 99;
    expect(validateAnalysis(bad).value?.healthScore).toBe(10);
  });

  test('warns when one item of several is dropped, rather than losing it silently', () => {
    const mixed = validAnalysis();
    mixed.foodItems.push({
      name: 'Phantom',
      servingSize: '1',
      calories: 99999,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    const result = validateAnalysis(mixed);
    expect(result.ok).toBe(true);
    expect(result.value?.foodItems).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes('1 item'))).toBe(true);
  });

  test('rejects a meal whose total is implausible even when every item is not', () => {
    const bad = validAnalysis();
    bad.foodItems = [1, 2, 3].map((n) => ({
      name: `Item ${n}`,
      servingSize: '1 porsi',
      calories: 4000,
      protein: 100,
      carbs: 400,
      fat: 150,
    }));
    const result = validateAnalysis(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes(String(LIMITS.mealCalories.max)))).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('leaves healthScore null rather than inventing one when the model omits it', () => {
    const raw = validAnalysis();
    delete raw.healthScore;
    expect(validateAnalysis(raw).value?.healthScore).toBeNull();
  });
});

describe('nutrient arithmetic', () => {
  const rice: FoodItem = {
    name: 'Nasi',
    portion: { unit: 'serving', count: 1 },
    eatenFraction: 0.5,
    nutrition: { calories: 400, protein: 8, carbs: 88, fat: 1, fiber: 1, sugar: 0 },
    source: 'ai',
  };

  test('mealTotals applies how much of each item was eaten', () => {
    expect(mealTotals([rice]).calories).toBe(200);
    expect(mealTotals([rice, { ...rice, eatenFraction: 1 }]).carbs).toBe(132);
  });

  test('scaleNutrients and sumNutrients are exact', () => {
    expect(scaleNutrients(rice.nutrition, 2).protein).toBe(16);
    expect(sumNutrients([]).calories).toBe(0);
  });

  test('analysisToItems keeps the serving text and marks the source', () => {
    const result = validateAnalysis(validAnalysis());
    if (!result.ok) throw new Error('fixture should be valid');
    const [item] = analysisToItems(result.value);
    expect(item).toEqual({
      name: 'Nasi Goreng',
      portion: { unit: 'serving', count: 1 },
      servingText: '1 porsi',
      eatenFraction: 1,
      nutrition: { calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 },
      source: 'ai',
    });
  });
});
