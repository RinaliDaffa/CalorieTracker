import type { Nutrients } from '@nutrisnap/core';
import type { GeminiContent, Lang } from './types';

const NUMBER = { type: 'NUMBER' } as const;

const NUTRITION_PROPERTIES = {
  calories: NUMBER,
  protein: NUMBER,
  carbs: NUMBER,
  fat: NUMBER,
  fiber: NUMBER,
  sugar: NUMBER,
};

export const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    foodItems: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          servingSize: { type: 'STRING' },
          ...NUTRITION_PROPERTIES,
        },
        required: ['name', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    totalNutrition: {
      type: 'OBJECT',
      properties: NUTRITION_PROPERTIES,
      required: ['calories', 'protein', 'carbs', 'fat'],
    },
    healthScore: { type: 'INTEGER' },
    aiTips: { type: 'STRING' },
    mealDescription: { type: 'STRING' },
  },
  required: ['foodItems', 'totalNutrition', 'healthScore', 'aiTips', 'mealDescription'],
} as const;

const LANGUAGE: Record<Lang, string> = { en: 'English', id: 'Indonesian (Bahasa Indonesia)' };

const ANALYSIS_TASK = `For each food item:
1. Identify the food item and estimate the serving size
2. Provide estimated nutritional values (calories in kcal, protein/carbs/fat/fiber/sugar in grams)

Also provide:
- totalNutrition: sum of all food items
- healthScore: 1-10 rating (10 = very healthy)
- aiTips: brief personalized tip about this meal (max 2 sentences)
- mealDescription: brief description of the overall meal`;

function outputRules(lang: Lang): string {
  return [
    `Write mealDescription and aiTips in ${LANGUAGE[lang]}.`,
    'Keep dish names as they are commonly known (for example "nasi goreng", "rendang").',
    'Dishes may be Indonesian; when they are, estimate portions against typical Indonesian servings.',
  ].join('\n');
}

export function photoAnalysisContents(base64Jpeg: string, lang: Lang): GeminiContent[] {
  const text = [
    'You are an expert nutritionist AI. Analyze this food photo carefully.',
    ANALYSIS_TASK,
    'Be as accurate as possible with portion estimates. If uncertain, give your best estimate based on typical serving sizes. Round values to reasonable numbers.',
    outputRules(lang),
  ].join('\n\n');
  return [
    {
      role: 'user',
      parts: [{ text }, { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } }],
    },
  ];
}

export function textAnalysisContents(description: string, lang: Lang): GeminiContent[] {
  const text = [
    `You are an expert nutritionist AI. The user describes their meal as: ${JSON.stringify(description)}`,
    ANALYSIS_TASK,
    'Use typical portion sizes and be reasonably accurate.',
    outputRules(lang),
  ].join('\n\n');
  return [{ role: 'user', parts: [{ text }] }];
}

export interface ChatMealSummary {
  mealType: string;
  itemNames: string[];
  calories: number;
}

export interface ChatContext {
  today: Nutrients;
  targets: Nutrients;
  meals: ChatMealSummary[];
}

export function chatContents(message: string, ctx: ChatContext, lang: Lang): GeminiContent[] {
  const r = Math.round;
  const lines = [
    'You are NutriSnap AI, a friendly and knowledgeable personal nutrition assistant. You help the user track and improve their diet.',
    'Keep responses concise, helpful and encouraging. Use emoji occasionally. You may use **bold**, *italics* and "- " bullet lists, and no other formatting.',
    `Reply in the language the user writes in. If that is unclear, reply in ${LANGUAGE[lang]}.`,
    '',
    "Today's intake so far:",
    `- Calories: ${r(ctx.today.calories)}/${r(ctx.targets.calories)} kcal`,
    `- Protein: ${r(ctx.today.protein)}/${r(ctx.targets.protein)} g`,
    `- Carbs: ${r(ctx.today.carbs)}/${r(ctx.targets.carbs)} g`,
    `- Fat: ${r(ctx.today.fat)}/${r(ctx.targets.fat)} g`,
  ];
  if (ctx.meals.length > 0) {
    lines.push('', 'Meals today:');
    for (const meal of ctx.meals) {
      lines.push(`- ${meal.mealType}: ${meal.itemNames.join(', ')} (${r(meal.calories)} kcal)`);
    }
  }
  lines.push('', `User's message: ${message}`);
  return [{ role: 'user', parts: [{ text: lines.join('\n') }] }];
}
