/** Shapes written by the legacy app. Every field is untrusted. */
export interface LegacyItem {
  name?: unknown;
  servingSize?: unknown;
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  fiber?: unknown;
  sugar?: unknown;
}

export interface LegacyMeal {
  id?: unknown;
  date?: unknown;
  mealType?: unknown;
  timestamp?: unknown;
  foodItems?: unknown;
  nutrition?: unknown;
  healthScore?: unknown;
  aiTips?: unknown;
  notes?: unknown;
}

export interface LegacyPhoto {
  mealId?: unknown;
  blob?: unknown;
  timestamp?: unknown;
}

export interface LegacyGoals {
  id?: unknown;
  [key: string]: unknown;
}

export interface LegacySetting {
  key?: unknown;
  value?: unknown;
}

export interface LegacyFavorite {
  id?: unknown;
  name?: unknown;
  foodItems?: unknown;
  nutrition?: unknown;
  createdAt?: unknown;
}

export interface LegacyChat {
  id?: unknown;
  role?: unknown;
  content?: unknown;
  timestamp?: unknown;
}

export interface LegacyDump {
  meals: LegacyMeal[];
  photos: LegacyPhoto[];
  goals: LegacyGoals[];
  settings: LegacySetting[];
  favorites: LegacyFavorite[];
  chats: LegacyChat[];
}
