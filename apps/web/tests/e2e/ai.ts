import type { Page, Route } from '@playwright/test';

export function geminiText(text: string) {
  return { candidates: [{ content: { role: 'model', parts: [{ text }] } }] };
}

export const NASI_GORENG = {
  foodItems: [
    {
      name: 'Nasi goreng',
      servingSize: '1 plate',
      calories: 600,
      protein: 20,
      carbs: 80,
      fat: 22,
      fiber: 3,
      sugar: 5,
    },
    {
      name: 'Es teh manis',
      servingSize: '1 glass',
      calories: 90,
      protein: 0,
      carbs: 23,
      fat: 0,
      fiber: 0,
      sugar: 22,
    },
  ],
  totalNutrition: { calories: 690, protein: 20, carbs: 103, fat: 22, fiber: 3, sugar: 27 },
  healthScore: 5,
  aiTips: 'Add some vegetables next time.',
  mealDescription: 'Fried rice with sweet iced tea',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export interface MockReply {
  status?: number;
  body: unknown;
}

/**
 * Intercepts every Gemini call. `reply` receives the parsed request body and
 * the zero-based call number, so a test can fail the first call and pass the next.
 */
export async function mockGemini(
  page: Page,
  reply: (body: unknown, call: number) => MockReply,
): Promise<{ calls: () => number }> {
  let count = 0;
  await page.route('https://generativelanguage.googleapis.com/**', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const result = reply(route.request().postDataJSON(), count++);
    await route.fulfill({
      status: result.status ?? 200,
      headers: CORS,
      contentType: 'application/json',
      json: result.body,
    });
  });
  return { calls: () => count };
}
