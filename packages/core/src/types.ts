export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'sahur' | 'buka' | 'malam';

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export const NUTRIENT_KEYS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
] as const satisfies readonly (keyof Nutrients)[];

export interface Portion {
  unit: string;
  count: number;
  grams?: number;
}

export type ItemSource = 'tkpi' | 'usda' | 'off' | 'label' | 'memory' | 'ai' | 'legacy';

export interface FoodItem {
  name: string;
  portion: Portion;
  servingText?: string;
  eatenFraction: number;
  nutrition: Nutrients;
  source: ItemSource;
}
