import { DEFAULT_TARGETS } from '@nutrisnap/core';
import { describe, expect, test } from 'vitest';
import { mapLegacy } from './map';
import type { LegacyDump } from './types';

const empty: LegacyDump = {
  meals: [],
  photos: [],
  goals: [],
  settings: [],
  favorites: [],
  chats: [],
};
let seq = 0;
const deps = { now: 1_000_000, today: '2026-09-28', newId: () => `id-${++seq}` };
const lunchTime = new Date(2026, 8, 20, 12, 30).getTime();

describe('mapLegacy', () => {
  test('maps a meal, its items and its photo link', () => {
    const photo = new Blob(['jpg']);
    const result = mapLegacy(
      {
        ...empty,
        meals: [
          {
            id: 'old1',
            date: '2026-09-20',
            mealType: 'lunch',
            timestamp: lunchTime,
            foodItems: [
              {
                name: 'Rendang',
                servingSize: '1 potong',
                calories: 190,
                protein: 15,
                carbs: 4,
                fat: 13,
              },
            ],
            nutrition: { calories: 190, protein: 15, carbs: 4, fat: 13, fiber: 0, sugar: 0 },
            healthScore: 7,
            aiTips: 'Good protein.',
            notes: 'warung',
          },
        ],
        photos: [{ mealId: 'old1', blob: photo, timestamp: lunchTime }],
      },
      deps,
    );
    const [meal] = result.meals;
    expect(meal).toMatchObject({
      date: '2026-09-20',
      time: lunchTime,
      mealType: 'lunch',
      source: 'legacy',
      status: 'done',
      healthScore: 7,
      tip: 'Good protein.',
      note: 'warung',
    });
    expect(meal?.items[0]).toEqual({
      name: 'Rendang',
      portion: { unit: 'serving', count: 1 },
      servingText: '1 potong',
      eatenFraction: 1,
      nutrition: { calories: 190, protein: 15, carbs: 4, fat: 13, fiber: 0, sugar: 0 },
      source: 'legacy',
    });
    expect(result.photoLinks).toHaveLength(1);
    expect(result.photoLinks[0]?.blob).toBe(photo);
    expect(meal?.photoId).toBe(result.photoLinks[0]?.photoId);
  });

  test('scales items so the day totals the user saw are preserved', () => {
    const result = mapLegacy(
      {
        ...empty,
        meals: [
          {
            id: 'old2',
            date: '2026-09-20',
            timestamp: lunchTime,
            mealType: 'lunch',
            foodItems: [
              { name: 'A', calories: 100, protein: 10 },
              { name: 'B', calories: 100, protein: 0 },
            ],
            nutrition: { calories: 300, protein: 10, carbs: 50 },
          },
        ],
      },
      deps,
    );
    const items = result.meals[0]?.items ?? [];
    expect(items.map((i) => i.nutrition.calories)).toEqual([150, 150]);
    expect(items[0]?.nutrition.carbs).toBe(50);
    expect(items[1]?.nutrition.carbs).toBe(0);
  });

  test('tolerates messy legacy records', () => {
    const result = mapLegacy(
      {
        ...empty,
        meals: [
          { id: 'x1', foodItems: null, nutrition: { calories: '250' }, mealType: 'brunch' },
          {
            id: 'x2',
            timestamp: lunchTime,
            foodItems: [null, { name: 42, calories: 'abc' }],
            nutrition: null,
          },
          'not an object' as never,
        ],
        photos: [
          { mealId: 'missing', blob: new Blob(['x']) },
          { mealId: 'x1', blob: 'not a blob' },
        ],
        chats: [
          { role: 'system', content: 'x' },
          { role: 'user', content: 5 },
        ],
      },
      deps,
    );
    expect(result.meals).toHaveLength(2);
    const [first, second] = result.meals;
    expect(first?.date).toBe('2026-09-28');
    expect(first?.mealType).toMatch(/^(breakfast|lunch|dinner|snack)$/);
    expect(first?.items).toEqual([
      {
        name: 'Meal',
        portion: { unit: 'serving', count: 1 },
        eatenFraction: 1,
        nutrition: { calories: 250, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
        source: 'legacy',
      },
    ]);
    expect(second?.items).toEqual([
      {
        name: 'Item',
        portion: { unit: 'serving', count: 1 },
        eatenFraction: 1,
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
        source: 'legacy',
      },
    ]);
    expect(result.photoLinks).toEqual([]);
    expect(result.chats).toEqual([]);
  });

  test('turns goals into a manual target from the first logged day', () => {
    const result = mapLegacy(
      {
        ...empty,
        meals: [
          { id: 'a', date: '2026-09-05', timestamp: lunchTime, mealType: 'lunch', foodItems: [] },
        ],
        goals: [{ id: 'current', ...DEFAULT_TARGETS, calories: 1800 }],
      },
      deps,
    );
    expect(result.targets).toEqual([
      expect.objectContaining({
        effectiveFrom: '2026-09-05',
        reason: 'manual',
        values: { ...DEFAULT_TARGETS, calories: 1800 },
      }),
    ]);
  });

  test('default goals map to a default target', () => {
    const result = mapLegacy({ ...empty, goals: [{ id: 'current', ...DEFAULT_TARGETS }] }, deps);
    expect(result.targets[0]?.reason).toBe('default');
    expect(result.targets[0]?.effectiveFrom).toBe('2026-09-28');
  });

  test('carries the key, model and theme, and marks onboarding done', () => {
    const result = mapLegacy(
      {
        ...empty,
        settings: [
          { key: 'apiKey', value: 'AIza-test' },
          { key: 'activeModel', value: 'gemini-2.5-flash' },
          { key: 'theme', value: 'light' },
        ],
      },
      deps,
    );
    expect(result.settings).toEqual({ apiKey: 'AIza-test', activeModel: 'gemini-2.5-flash' });
    expect(result.theme).toBe('light');
  });

  test('keeps favorites and valid chats in order', () => {
    const result = mapLegacy(
      {
        ...empty,
        favorites: [
          { id: 'f', name: 'Soto', foodItems: [{ name: 'Soto', calories: 300 }], createdAt: 5 },
        ],
        chats: [
          { role: 'assistant', content: 'second', timestamp: 2 },
          { role: 'user', content: 'first', timestamp: 1 },
        ],
      },
      deps,
    );
    expect(result.favorites[0]).toMatchObject({ name: 'Soto', createdAt: 5 });
    expect(result.chats.map((c) => c.content)).toEqual(['first', 'second']);
  });
});
