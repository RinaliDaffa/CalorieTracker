import { expect, test } from 'vitest';
import type { MealRecord } from '@/db/schema';
import { csvCell, mealsToCsv } from './csv';

test('cells that a spreadsheet would run as formulas are pinned to text', () => {
  expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  expect(csvCell('+1')).toBe(`"'+1"`);
  expect(csvCell('-2')).toBe(`"'-2"`);
  expect(csvCell('@SUM')).toBe(`"'@SUM"`);
  expect(csvCell('Nasi "spesial"')).toBe(`"Nasi ""spesial"""`);
  expect(csvCell(undefined)).toBe('""');
});

test('one row per meal with totals that respect how much was eaten', () => {
  const meal: MealRecord = {
    id: 'a',
    date: '2026-09-28',
    time: 0,
    mealType: 'lunch',
    source: 'photo',
    status: 'done',
    items: [
      {
        name: 'Nasi',
        portion: { unit: 'serving', count: 1 },
        eatenFraction: 0.5,
        nutrition: { calories: 400, protein: 8, carbs: 88, fat: 1, fiber: 1, sugar: 0 },
        source: 'ai',
      },
      {
        name: 'Ayam',
        portion: { unit: 'serving', count: 1 },
        eatenFraction: 1,
        nutrition: { calories: 250, protein: 25.25, carbs: 0, fat: 16, fiber: 0, sugar: 0 },
        source: 'ai',
      },
    ],
    healthScore: 6,
    note: 'warung',
    createdAt: 0,
    updatedAt: 0,
  };
  const [header, row] = mealsToCsv([meal], () => '12:00').split('\n');
  expect(header).toBe(
    'Date,Time,Meal Type,Food Items,Calories,Protein (g),Carbs (g),Fat (g),Fiber (g),Sugar (g),Health Score,Notes',
  );
  expect(row).toBe(
    '"2026-09-28","12:00","lunch","Nasi; Ayam","450","29.3","44","16.5","0.5","0","6","warung"',
  );
});
