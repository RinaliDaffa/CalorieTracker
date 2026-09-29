import type { DateKey, FoodItem, MealType, TargetReason, Targets } from '@nutrisnap/core';
import Dexie, { type EntityTable } from 'dexie';

export interface Syncable {
  id: string;
  updatedAt: number;
  deletedAt?: number;
}

export type MealSource =
  | 'photo'
  | 'barcode'
  | 'label'
  | 'screenshot'
  | 'text'
  | 'search'
  | 'recipe'
  | 'quick'
  | 'favorite'
  | 'legacy';

export type MealStatus = 'queued' | 'analyzing' | 'done' | 'failed';

export interface MealRecord extends Syncable {
  date: DateKey;
  time: number;
  mealType: MealType;
  source: MealSource;
  status: MealStatus;
  items: FoodItem[];
  photoId?: string;
  note?: string;
  description?: string;
  healthScore?: number | null;
  tip?: string;
  createdAt: number;
}

export interface PhotoRecord extends Syncable {
  full: Blob;
  thumb: Blob;
  takenAt: number;
}

export interface FavoriteRecord extends Syncable {
  name: string;
  items: FoodItem[];
  createdAt: number;
}

export interface ChatRecord extends Syncable {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface TargetRecord extends Syncable {
  effectiveFrom: DateKey;
  values: Targets;
  reason: TargetReason;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export type NutriSnapDb = Dexie & {
  meals: EntityTable<MealRecord, 'id'>;
  photos: EntityTable<PhotoRecord, 'id'>;
  favorites: EntityTable<FavoriteRecord, 'id'>;
  chats: EntityTable<ChatRecord, 'id'>;
  targets: EntityTable<TargetRecord, 'id'>;
  settings: EntityTable<SettingRecord, 'key'>;
  meta: EntityTable<MetaRecord, 'key'>;
};

export const DB_NAME = 'nutrisnap-v3';

export function createDb(name: string = DB_NAME): NutriSnapDb {
  const database = new Dexie(name) as NutriSnapDb;
  database.version(1).stores({
    meals: 'id, date, time',
    photos: 'id',
    favorites: 'id, createdAt',
    chats: 'id, createdAt',
    targets: 'id, effectiveFrom',
    settings: 'key',
    meta: 'key',
  });
  return database;
}

export const db = createDb();
