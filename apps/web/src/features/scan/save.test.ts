import type { Analysis } from '@nutrisnap/core';
import { expect, test, vi } from 'vitest';
import { getMealWithPhoto } from '@/db/meals';
import { freshDb } from '@/db/test-db';
import { saveAnalysis } from './save';

const analysis: Analysis = {
  foodItems: [
    {
      name: 'Bubur ayam',
      servingSize: '1 mangkok',
      calories: 350,
      protein: 15,
      carbs: 50,
      fat: 9,
      fiber: 1,
      sugar: 2,
    },
  ],
  totalNutrition: { calories: 350, protein: 15, carbs: 50, fat: 9, fiber: 1, sugar: 2 },
  healthScore: 7,
  aiTips: 'Add an egg for protein.',
  mealDescription: 'Chicken porridge',
};

test('saves the analysis for the local day, typed by the clock', async () => {
  const d = freshDb();
  const now = new Date(2026, 8, 28, 7, 30);
  const meal = await saveAnalysis(d, { analysis, source: 'photo', now });
  expect(meal).toMatchObject({
    date: '2026-09-28',
    time: now.getTime(),
    mealType: 'breakfast',
    source: 'photo',
    description: 'Chicken porridge',
    healthScore: 7,
    tip: 'Add an egg for protein.',
  });
  expect(meal.items[0]).toMatchObject({
    name: 'Bubur ayam',
    servingText: '1 mangkok',
    source: 'ai',
  });
});

test('an explicit meal type wins, and the photo is stored with the meal', async () => {
  const d = freshDb();
  const photo = { full: new Blob(['f']), thumb: new Blob(['t']), takenAt: 1 };
  const meal = await saveAnalysis(d, {
    analysis,
    source: 'text',
    now: new Date(2026, 8, 28, 23, 0),
    mealType: 'dinner',
    photo,
  });
  const loaded = await getMealWithPhoto(d, meal.id);
  expect(loaded?.meal.mealType).toBe('dinner');
  expect(loaded?.photo).toBeDefined();
});

test('when the photo cannot be stored the meal is still saved, without it', async () => {
  const d = freshDb();
  vi.spyOn(d.photos, 'add').mockRejectedValue(new Error('DataCloneError'));
  const photo = { full: new Blob(['f']), thumb: new Blob(['t']), takenAt: 1 };
  const meal = await saveAnalysis(d, {
    analysis,
    source: 'photo',
    now: new Date(2026, 8, 28, 12, 0),
    photo,
  });
  expect(meal.photoId).toBeUndefined();
  expect(await d.meals.get(meal.id)).toMatchObject({
    id: meal.id,
    description: 'Chicken porridge',
  });
  expect(await d.photos.count()).toBe(0);
});
