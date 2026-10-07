import type { MealType } from './types';

export const DAY_MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
] as const satisfies readonly MealType[];

/** Legacy boundaries, kept for parity: 05-10 breakfast, 10-15 lunch, 15-21 dinner, else snack. */
export function mealTypeAt(date: Date): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

export type Greeting = 'morning' | 'afternoon' | 'evening';

export function greetingAt(date: Date): Greeting {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
