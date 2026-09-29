import type { FoodItem } from '@nutrisnap/core';
import { describe, expect, test } from 'vitest';
import {
  addMeal,
  allMeals,
  getMealWithPhoto,
  loggedDates,
  mealsBetween,
  mealsOn,
  restoreMeal,
  setMealType,
  softDeleteMeal,
} from './meals';
import { purgeTombstones } from './purge';
import { freshDb } from './test-db';

const rice: FoodItem = {
  name: 'Nasi',
  portion: { unit: 'serving', count: 1 },
  eatenFraction: 1,
  nutrition: { calories: 200, protein: 4, carbs: 44, fat: 0, fiber: 1, sugar: 0 },
  source: 'ai',
};

const base = { mealType: 'lunch' as const, source: 'photo' as const, items: [rice] };

describe('meals', () => {
  test('addMeal stores a meal with a UUIDv7 id and its photo', async () => {
    const d = freshDb();
    const photo = { full: new Blob(['full']), thumb: new Blob(['thumb']), takenAt: 5 };
    const meal = await addMeal(d, { ...base, date: '2026-09-28', time: 1000, photo }, 1000);
    expect(meal.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(meal.status).toBe('done');
    const loaded = await getMealWithPhoto(d, meal.id);
    expect(loaded?.meal.items[0]?.name).toBe('Nasi');
    expect(await loaded?.photo?.thumb.text()).toBe('thumb');
  });

  test('mealsOn returns the day in time order and hides deleted meals', async () => {
    const d = freshDb();
    const late = await addMeal(d, { ...base, date: '2026-09-28', time: 3000 });
    const early = await addMeal(d, { ...base, date: '2026-09-28', time: 1000 });
    await addMeal(d, { ...base, date: '2026-09-27', time: 500 });
    expect((await mealsOn(d, '2026-09-28')).map((m) => m.id)).toEqual([early.id, late.id]);

    await softDeleteMeal(d, early.id, 4000);
    expect((await mealsOn(d, '2026-09-28')).map((m) => m.id)).toEqual([late.id]);
    expect(await getMealWithPhoto(d, early.id)).toBeUndefined();
  });

  test('restoreMeal undoes a delete, including the photo', async () => {
    const d = freshDb();
    const photo = { full: new Blob(['f']), thumb: new Blob(['t']), takenAt: 1 };
    const meal = await addMeal(d, { ...base, date: '2026-09-28', time: 1000, photo });
    await softDeleteMeal(d, meal.id);
    await restoreMeal(d, meal.id);
    const loaded = await getMealWithPhoto(d, meal.id);
    expect(loaded?.meal.deletedAt).toBeUndefined();
    expect(loaded?.photo).toBeDefined();
  });

  test('ranges, logged dates and the full list skip tombstones', async () => {
    const d = freshDb();
    await addMeal(d, { ...base, date: '2026-09-01', time: 1 });
    const gone = await addMeal(d, { ...base, date: '2026-09-02', time: 2 });
    await addMeal(d, { ...base, date: '2026-10-01', time: 3 });
    await softDeleteMeal(d, gone.id);
    expect((await mealsBetween(d, '2026-09-01', '2026-09-30')).length).toBe(1);
    expect([...(await loggedDates(d, '2026-09-01', '2026-10-31'))].sort()).toEqual([
      '2026-09-01',
      '2026-10-01',
    ]);
    expect((await allMeals(d)).map((m) => m.date)).toEqual(['2026-10-01', '2026-09-01']);
  });

  test('setMealType changes only the meal type', async () => {
    const d = freshDb();
    const meal = await addMeal(d, { ...base, date: '2026-09-28', time: 1 });
    await setMealType(d, meal.id, 'dinner', 99);
    const loaded = await getMealWithPhoto(d, meal.id);
    expect(loaded?.meal.mealType).toBe('dinner');
    expect(loaded?.meal.updatedAt).toBe(99);
  });

  test('purgeTombstones removes only tombstones older than 30 days', async () => {
    const d = freshDb();
    const day = 24 * 60 * 60 * 1000;
    const old = await addMeal(d, { ...base, date: '2026-08-01', time: 1 });
    const recent = await addMeal(d, { ...base, date: '2026-09-27', time: 2 });
    const kept = await addMeal(d, { ...base, date: '2026-09-28', time: 3 });
    await softDeleteMeal(d, old.id, 0);
    await softDeleteMeal(d, recent.id, 40 * day);
    expect(await purgeTombstones(d, 45 * day)).toBe(1);
    expect(await d.meals.get(old.id)).toBeUndefined();
    expect(await d.meals.get(recent.id)).toBeDefined();
    expect(await d.meals.get(kept.id)).toBeDefined();
  });
});
