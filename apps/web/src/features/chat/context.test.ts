import { DEFAULT_TARGETS } from '@nutrisnap/core';
import { expect, test } from 'vitest';
import { addMeal } from '@/db/meals';
import { freshDb } from '@/db/test-db';
import { buildChatContext } from './context';

test('summarizes today only, with targets', async () => {
  const d = freshDb();
  const item = (name: string, calories: number) => ({
    name,
    portion: { unit: 'serving' as const, count: 1 },
    eatenFraction: 1,
    nutrition: { calories, protein: 10, carbs: 20, fat: 5, fiber: 0, sugar: 0 },
    source: 'ai' as const,
  });
  await addMeal(d, {
    date: '2026-09-28',
    time: 1,
    mealType: 'lunch',
    source: 'text',
    items: [item('Soto', 300)],
  });
  await addMeal(d, {
    date: '2026-09-27',
    time: 0,
    mealType: 'dinner',
    source: 'text',
    items: [item('Sate', 500)],
  });
  const ctx = await buildChatContext(d, new Date(2026, 8, 28, 20));
  expect(ctx.today.calories).toBe(300);
  expect(ctx.targets).toEqual(DEFAULT_TARGETS);
  expect(ctx.meals).toEqual([{ mealType: 'lunch', itemNames: ['Soto'], calories: 300 }]);
});
