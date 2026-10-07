import type { ChatContext } from '@nutrisnap/ai';
import { mealTotals, sumNutrients, toDateKey } from '@nutrisnap/core';
import { mealsOn } from '@/db/meals';
import type { NutriSnapDb } from '@/db/schema';
import { currentTargets } from '@/db/targets';

export async function buildChatContext(d: NutriSnapDb, now: Date): Promise<ChatContext> {
  const today = toDateKey(now);
  const meals = await mealsOn(d, today);
  return {
    today: sumNutrients(meals.map((meal) => mealTotals(meal.items))),
    targets: await currentTargets(d, today),
    meals: meals.slice(-5).map((meal) => ({
      mealType: meal.mealType,
      itemNames: meal.items.map((item) => item.name),
      calories: mealTotals(meal.items).calories,
    })),
  };
}
