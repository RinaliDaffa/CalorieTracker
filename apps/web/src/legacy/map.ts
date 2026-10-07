import {
  type DateKey,
  DEFAULT_TARGETS,
  type FoodItem,
  isDateKey,
  type MealType,
  mealTypeAt,
  NUTRIENT_KEYS,
  type Nutrients,
  sameTargets,
  type Targets,
  toDateKey,
  uuidv7At,
} from '@nutrisnap/core';
import type { ChatRecord, FavoriteRecord, MealRecord, TargetRecord } from '@/db/schema';
import type { LegacyDump } from './types';

export interface MapDeps {
  now: number;
  today: DateKey;
  newId?: (ms: number) => string;
}

export interface PhotoLink {
  photoId: string;
  blob: Blob;
  takenAt: number;
}

export interface MappedLegacy {
  meals: MealRecord[];
  photoLinks: PhotoLink[];
  favorites: FavoriteRecord[];
  chats: ChatRecord[];
  targets: TargetRecord[];
  settings: { apiKey?: string; activeModel?: string };
  theme?: 'dark' | 'light';
}

const DAY_TYPES: readonly string[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nonNegative = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const finiteTime = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

function nutrientsOf(v: unknown): Nutrients {
  const source = isRecord(v) ? v : {};
  return {
    calories: nonNegative(source.calories),
    protein: nonNegative(source.protein),
    carbs: nonNegative(source.carbs),
    fat: nonNegative(source.fat),
    fiber: nonNegative(source.fiber),
    sugar: nonNegative(source.sugar),
  };
}

function itemsOf(v: unknown): FoodItem[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isRecord).map((item) => {
    const servingText = text(item.servingSize);
    return {
      name: text(item.name) ?? 'Item',
      portion: { unit: 'serving', count: 1 },
      ...(servingText ? { servingText } : {}),
      eatenFraction: 1,
      nutrition: nutrientsOf(item),
      source: 'legacy' as const,
    };
  });
}

/**
 * Pre-validation builds stored meal totals that did not always match their
 * items. The dashboard showed the totals, so items are scaled per nutrient
 * until they add up to what the user saw.
 */
function reconcile(items: FoodItem[], totals: unknown, fallbackName: string): FoodItem[] {
  if (!isRecord(totals)) return items;
  const target = nutrientsOf(totals);
  if (items.length === 0) {
    // A meal with totals but no readable items still counted toward the day.
    return target.calories > 0
      ? [
          {
            name: fallbackName,
            portion: { unit: 'serving', count: 1 },
            eatenFraction: 1,
            nutrition: target,
            source: 'legacy',
          },
        ]
      : [];
  }
  const result = items.map((item) => ({ ...item, nutrition: { ...item.nutrition } }));
  for (const key of NUTRIENT_KEYS) {
    const sum = result.reduce((acc, item) => acc + item.nutrition[key], 0);
    const want = target[key];
    if (Math.abs(sum - want) <= Math.max(1, want * 0.01)) continue;
    if (sum > 0) {
      for (const item of result) item.nutrition[key] = (item.nutrition[key] * want) / sum;
    } else {
      const first = result[0];
      if (first) first.nutrition[key] = want;
    }
  }
  return result;
}

function healthScoreOf(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.round(Math.min(10, Math.max(1, v)))
    : null;
}

export function mapLegacy(dump: LegacyDump, deps: MapDeps): MappedLegacy {
  const newId = deps.newId ?? ((ms: number) => uuidv7At(ms));
  const meals: MealRecord[] = [];
  const idByLegacy = new Map<string, MealRecord>();

  for (const raw of dump.meals) {
    if (!isRecord(raw)) continue;
    const date = isDateKey(raw.date) ? raw.date : undefined;
    const stamp = finiteTime(raw.timestamp);
    const time = stamp ?? (date ? new Date(`${date}T12:00:00`).getTime() : deps.now);
    const mealDate = date ?? (stamp ? toDateKey(new Date(stamp)) : deps.today);
    const mealType: MealType = DAY_TYPES.includes(String(raw.mealType))
      ? (raw.mealType as MealType)
      : mealTypeAt(new Date(time));
    const tip = text(raw.aiTips);
    const note = text(raw.notes);
    const meal: MealRecord = {
      id: newId(time),
      date: mealDate,
      time,
      mealType,
      source: 'legacy',
      status: 'done',
      items: reconcile(itemsOf(raw.foodItems), raw.nutrition, note ?? 'Meal'),
      healthScore: healthScoreOf(raw.healthScore),
      ...(tip ? { tip } : {}),
      ...(note ? { note } : {}),
      createdAt: time,
      updatedAt: deps.now,
    };
    meals.push(meal);
    if (typeof raw.id === 'string') idByLegacy.set(raw.id, meal);
  }

  const photoLinks: PhotoLink[] = [];
  for (const raw of dump.photos) {
    if (!isRecord(raw) || !(raw.blob instanceof Blob) || typeof raw.mealId !== 'string') continue;
    const meal = idByLegacy.get(raw.mealId);
    if (!meal) continue;
    const takenAt = finiteTime(raw.timestamp) ?? meal.time;
    const photoId = newId(takenAt);
    meal.photoId = photoId;
    photoLinks.push({ photoId, blob: raw.blob, takenAt });
  }

  const favorites: FavoriteRecord[] = dump.favorites.filter(isRecord).map((raw) => {
    const createdAt = finiteTime(raw.createdAt) ?? deps.now;
    const name = text(raw.name) ?? 'Favorite';
    return {
      id: newId(createdAt),
      name,
      items: reconcile(itemsOf(raw.foodItems), raw.nutrition, name),
      createdAt,
      updatedAt: deps.now,
    };
  });

  const chats: ChatRecord[] = dump.chats
    .filter(isRecord)
    .filter(
      (raw) => (raw.role === 'user' || raw.role === 'assistant') && typeof raw.content === 'string',
    )
    .map((raw) => {
      const createdAt = finiteTime(raw.timestamp) ?? deps.now;
      return {
        id: newId(createdAt),
        role: raw.role as ChatRecord['role'],
        content: raw.content as string,
        createdAt,
        updatedAt: deps.now,
      };
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  const targets: TargetRecord[] = [];
  const goals = dump.goals.find((g) => isRecord(g) && g.id === 'current');
  if (goals) {
    const values: Targets = { ...DEFAULT_TARGETS };
    for (const key of NUTRIENT_KEYS) {
      const value = nonNegative(goals[key]);
      if (value > 0) values[key] = Math.round(value);
    }
    const firstDay = meals.map((m) => m.date).sort()[0] ?? deps.today;
    targets.push({
      id: newId(deps.now),
      effectiveFrom: firstDay,
      values,
      reason: sameTargets(values, DEFAULT_TARGETS) ? 'default' : 'manual',
      updatedAt: deps.now,
    });
  }

  const settingValue = (key: string) =>
    dump.settings.find((s) => isRecord(s) && s.key === key)?.value;
  const apiKey = text(settingValue('apiKey'));
  const activeModel = text(settingValue('activeModel'));
  const theme = settingValue('theme');

  return {
    meals,
    photoLinks,
    favorites,
    chats,
    targets,
    settings: { ...(apiKey ? { apiKey } : {}), ...(activeModel ? { activeModel } : {}) },
    ...(theme === 'dark' || theme === 'light' ? { theme } : {}),
  };
}
