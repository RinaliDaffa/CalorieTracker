import type { FoodItem, MealType } from '@nutrisnap/core';
import type { FavoriteRecord, MealRecord } from '../../src/db/schema';

export function todayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function item(name: string, calories: number, protein = 10, carbs = 20, fat = 5): FoodItem {
  return {
    name,
    portion: { unit: 'serving', count: 1 },
    servingText: '1 porsi',
    eatenFraction: 1,
    nutrition: { calories, protein, carbs, fat, fiber: 2, sugar: 3 },
    source: 'ai',
  };
}

let n = 0;

export function meal(date: string, mealType: MealType, items: FoodItem[], hour = 12): MealRecord {
  n += 1;
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const time = new Date(y, mo - 1, d, hour, n % 60).getTime();
  return {
    id: `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`,
    date,
    time,
    mealType,
    source: 'photo',
    status: 'done',
    items,
    healthScore: 6,
    tip: 'Nice balance.',
    description: items.map((i) => i.name).join(', '),
    createdAt: time,
    updatedAt: time,
  };
}

export function favorite(name: string, items: FoodItem[]): FavoriteRecord {
  n += 1;
  return {
    id: `00000000-0000-7000-9000-${String(n).padStart(12, '0')}`,
    name,
    items,
    createdAt: Date.now() - n,
    updatedAt: Date.now(),
  };
}
