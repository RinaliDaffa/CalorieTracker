import {
  type Analysis,
  analysisToItems,
  type MealType,
  mealTypeAt,
  toDateKey,
} from '@nutrisnap/core';
import { addMeal, type NewMeal } from '@/db/meals';
import type { MealRecord, NutriSnapDb } from '@/db/schema';

export interface SaveAnalysisInput {
  analysis: Analysis;
  source: 'photo' | 'text';
  now: Date;
  mealType?: MealType;
  photo?: { full: Blob; thumb: Blob; takenAt: number };
}

/**
 * Results are saved the moment they arrive; the user corrects afterwards or undoes.
 * If the photo cannot be stored (WebKit's ephemeral IndexedDB rejects Blobs), the
 * meal is saved without it rather than lost.
 */
export async function saveAnalysis(d: NutriSnapDb, input: SaveAnalysisInput): Promise<MealRecord> {
  const { analysis, now } = input;
  const meal: NewMeal = {
    date: toDateKey(now),
    time: now.getTime(),
    mealType: input.mealType ?? mealTypeAt(now),
    source: input.source,
    items: analysisToItems(analysis),
    photo: input.photo,
    description: analysis.mealDescription || undefined,
    healthScore: analysis.healthScore,
    tip: analysis.aiTips || undefined,
  };
  try {
    return await addMeal(d, meal, now.getTime());
  } catch (error) {
    if (!meal.photo) throw error;
    return addMeal(d, { ...meal, photo: undefined }, now.getTime());
  }
}
