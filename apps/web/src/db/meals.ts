import { type DateKey, type FoodItem, type MealType, uuidv7At } from '@nutrisnap/core';
import type { MealRecord, MealSource, NutriSnapDb, PhotoRecord } from './schema';

export interface NewMeal {
  date: DateKey;
  time: number;
  mealType: MealType;
  source: MealSource;
  items: FoodItem[];
  photo?: { full: Blob; thumb: Blob; takenAt: number };
  note?: string;
  description?: string;
  healthScore?: number | null;
  tip?: string;
}

const live = <T extends { deletedAt?: number }>(record: T): boolean =>
  record.deletedAt === undefined;

export async function addMeal(
  d: NutriSnapDb,
  input: NewMeal,
  now: number = Date.now(),
): Promise<MealRecord> {
  const { photo, ...rest } = input;
  const meal: MealRecord = {
    ...rest,
    id: uuidv7At(input.time),
    status: 'done',
    createdAt: now,
    updatedAt: now,
  };
  await d.transaction('rw', d.meals, d.photos, async () => {
    if (photo) {
      const record: PhotoRecord = { id: uuidv7At(photo.takenAt), ...photo, updatedAt: now };
      await d.photos.add(record);
      meal.photoId = record.id;
    }
    await d.meals.add(meal);
  });
  return meal;
}

async function setDeleted(
  d: NutriSnapDb,
  id: string,
  deletedAt: number | undefined,
  now: number,
): Promise<void> {
  await d.transaction('rw', d.meals, d.photos, async () => {
    const meal = await d.meals.get(id);
    if (!meal) return;
    // Dexie deletes a property that is updated to undefined.
    await d.meals.update(id, { deletedAt, updatedAt: now });
    if (meal.photoId) await d.photos.update(meal.photoId, { deletedAt, updatedAt: now });
  });
}

export function softDeleteMeal(
  d: NutriSnapDb,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  return setDeleted(d, id, now, now);
}

export function restoreMeal(d: NutriSnapDb, id: string, now: number = Date.now()): Promise<void> {
  return setDeleted(d, id, undefined, now);
}

export async function setMealType(
  d: NutriSnapDb,
  id: string,
  mealType: MealType,
  now: number = Date.now(),
): Promise<void> {
  await d.meals.update(id, { mealType, updatedAt: now });
}

export async function mealsOn(d: NutriSnapDb, date: DateKey): Promise<MealRecord[]> {
  const meals = await d.meals.where('date').equals(date).filter(live).toArray();
  return meals.sort((a, b) => a.time - b.time);
}

export async function mealsBetween(
  d: NutriSnapDb,
  from: DateKey,
  to: DateKey,
): Promise<MealRecord[]> {
  const meals = await d.meals.where('date').between(from, to, true, true).filter(live).toArray();
  return meals.sort((a, b) => a.time - b.time);
}

export async function loggedDates(
  d: NutriSnapDb,
  from: DateKey,
  to: DateKey,
): Promise<Set<DateKey>> {
  return new Set((await mealsBetween(d, from, to)).map((meal) => meal.date));
}

export async function allMeals(d: NutriSnapDb): Promise<MealRecord[]> {
  return (await d.meals.orderBy('time').reverse().filter(live).toArray()) as MealRecord[];
}

export async function getMealWithPhoto(
  d: NutriSnapDb,
  id: string,
): Promise<{ meal: MealRecord; photo?: PhotoRecord } | undefined> {
  const meal = await d.meals.get(id);
  if (!meal || !live(meal)) return undefined;
  const photo = meal.photoId ? await d.photos.get(meal.photoId) : undefined;
  return photo && live(photo) ? { meal, photo } : { meal };
}
