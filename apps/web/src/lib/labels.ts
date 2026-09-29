import type { Greeting, HealthBand, MealType, Nutrients } from '@nutrisnap/core';
import { m } from '@/paraglide/messages.js';

export function mealTypeLabel(type: MealType): string {
  switch (type) {
    case 'breakfast':
      return m.meal_breakfast();
    case 'lunch':
      return m.meal_lunch();
    case 'dinner':
      return m.meal_dinner();
    case 'snack':
      return m.meal_snack();
    case 'sahur':
      return m.meal_sahur();
    case 'buka':
      return m.meal_buka();
    case 'malam':
      return m.meal_malam();
  }
}

export function greetingLabel(greeting: Greeting): string {
  switch (greeting) {
    case 'morning':
      return m.greeting_morning();
    case 'afternoon':
      return m.greeting_afternoon();
    case 'evening':
      return m.greeting_evening();
  }
}

export function healthBandLabel(band: HealthBand): string {
  switch (band) {
    case 'excellent':
      return m.health_excellent();
    case 'great':
      return m.health_great();
    case 'good':
      return m.health_good();
    case 'fair':
      return m.health_fair();
    case 'poor':
      return m.health_poor();
  }
}

export function nutrientLabel(key: keyof Nutrients): string {
  switch (key) {
    case 'calories':
      return m.nutrient_calories();
    case 'protein':
      return m.nutrient_protein();
    case 'carbs':
      return m.nutrient_carbs();
    case 'fat':
      return m.nutrient_fat();
    case 'fiber':
      return m.nutrient_fiber();
    case 'sugar':
      return m.nutrient_sugar();
  }
}
