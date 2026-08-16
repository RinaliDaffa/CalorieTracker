import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalysis, LIMITS } from '../../js/core/nutrition.js';

function validAnalysis() {
  return {
    foodItems: [
      { name: 'Nasi Goreng', servingSize: '1 porsi',
        calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 }
    ],
    totalNutrition: { calories: 600, protein: 20, carbs: 80, fat: 22, fiber: 3, sugar: 5 },
    healthScore: 6,
    aiTips: 'Add vegetables.',
    mealDescription: 'Fried rice'
  };
}

test('accepts a well-formed analysis unchanged', () => {
  const result = validateAnalysis(validAnalysis());
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.foodItems[0].calories, 600);
});

test('rejects an implausible calorie count', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = 47000;
  const result = validateAnalysis(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('rejects negative calories', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = -50;
  assert.equal(validateAnalysis(bad).ok, false);
});

test('rejects non-finite numbers', () => {
  const bad = validAnalysis();
  bad.foodItems[0].calories = Number.POSITIVE_INFINITY;
  assert.equal(validateAnalysis(bad).ok, false);

  const nan = validAnalysis();
  nan.foodItems[0].protein = Number.NaN;
  assert.equal(validateAnalysis(nan).ok, false);
});

test('clamps an out-of-range macro rather than rejecting', () => {
  const bad = validAnalysis();
  bad.foodItems[0].protein = 900;
  const result = validateAnalysis(bad);
  assert.equal(result.ok, true);
  assert.equal(result.value.foodItems[0].protein, LIMITS.itemMacroGrams.max);
});

test('rejects a missing or empty food list', () => {
  assert.equal(validateAnalysis({}).ok, false);
  assert.equal(validateAnalysis({ foodItems: [] }).ok, false);
  assert.equal(validateAnalysis(null).ok, false);
});

test('rejects an item with no name', () => {
  const bad = validAnalysis();
  bad.foodItems[0].name = '';
  assert.equal(validateAnalysis(bad).ok, false);
});

test('defaults missing optional macros to zero', () => {
  const partial = validAnalysis();
  delete partial.foodItems[0].fiber;
  delete partial.foodItems[0].sugar;
  const result = validateAnalysis(partial);
  assert.equal(result.ok, true);
  assert.equal(result.value.foodItems[0].fiber, 0);
});

test('recomputes totals from items rather than trusting the model', () => {
  const bad = validAnalysis();
  bad.totalNutrition.calories = 99;   // model arithmetic error
  const result = validateAnalysis(bad);
  assert.equal(result.ok, true);
  assert.equal(result.value.totalNutrition.calories, 600);
});

test('warns but still saves when macros disagree with calories', () => {
  const odd = validAnalysis();
  // 4*5 + 4*5 + 9*1 = 49 kcal claimed as 600 - far beyond 30%
  odd.foodItems[0] = { ...odd.foodItems[0], protein: 5, carbs: 5, fat: 1 };
  const result = validateAnalysis(odd);
  assert.equal(result.ok, true, 'a soft warning must never block the save');
  assert.ok(result.warnings.length > 0);
});

test('does not warn when macros agree with calories', () => {
  const result = validateAnalysis(validAnalysis());
  assert.equal(result.warnings.length, 0);
});

test('clamps healthScore into 1-10', () => {
  const bad = validAnalysis();
  bad.healthScore = 99;
  assert.equal(validateAnalysis(bad).value.healthScore, 10);
});

test('warns when one item of several is dropped, rather than losing it silently', () => {
  const mixed = validAnalysis();
  mixed.foodItems.push({
    name: 'Phantom Item', servingSize: '1',
    calories: 99999, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0
  });
  const result = validateAnalysis(mixed);
  assert.equal(result.ok, true, 'the still-valid item must still save');
  assert.equal(result.value.foodItems.length, 1);
  assert.ok(result.warnings.some(w => w.includes('1 item')));
});
