import { type FoodItem, uuidv7At } from '@nutrisnap/core';
import type { FavoriteRecord, NutriSnapDb } from './schema';

export async function addFavorite(
  d: NutriSnapDb,
  name: string,
  items: FoodItem[],
  now: number = Date.now(),
): Promise<FavoriteRecord> {
  const favorite: FavoriteRecord = {
    id: uuidv7At(now),
    name,
    items,
    createdAt: now,
    updatedAt: now,
  };
  await d.favorites.add(favorite);
  return favorite;
}

export async function listFavorites(d: NutriSnapDb): Promise<FavoriteRecord[]> {
  const favorites = await d.favorites.filter((f) => f.deletedAt === undefined).toArray();
  return favorites.sort((a, b) => b.createdAt - a.createdAt);
}

export async function softDeleteFavorite(
  d: NutriSnapDb,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await d.favorites.update(id, { deletedAt: now, updatedAt: now });
}

export async function restoreFavorite(
  d: NutriSnapDb,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await d.favorites.update(id, { deletedAt: undefined, updatedAt: now });
}
