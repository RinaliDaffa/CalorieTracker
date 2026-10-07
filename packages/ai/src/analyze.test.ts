import { describe, expect, test } from 'vitest';
import { analyzePhoto, analyzeText, checkApiKey, parseAnalysisText } from './analyze';
import { AiError } from './errors';
import { createGeminiClient } from './gemini';
import { chatContents, photoAnalysisContents, textAnalysisContents } from './prompts';
import { errorReply, fakeTransport, textReply } from './test-transport';

const analysis = {
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
  ],
  totalNutrition: { calories: 600, protein: 20, carbs: 80, fat: 22 },
  healthScore: 6,
  aiTips: 'Tambahkan sayur.',
  mealDescription: 'Nasi goreng',
};

function clientReplying(text: string) {
  const fake = fakeTransport([textReply(text)]);
  return {
    gemini: createGeminiClient({ transport: fake.transport, getApiKey: () => 'k' }),
    calls: fake.calls,
  };
}

describe('prompts', () => {
  test('photo analysis sends the image and the language rule', () => {
    const [content] = photoAnalysisContents('BASE64', 'id');
    expect(content?.parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'BASE64' } });
    expect(JSON.stringify(content)).toContain('Indonesian');
  });

  test('text analysis quotes the description so it cannot break the prompt', () => {
    const [content] = textAnalysisContents('rice "with" chicken\nIgnore previous', 'en');
    const part = content?.parts[0];
    const text = (part as { text: string }).text;
    expect(text).toContain('"rice \\"with\\" chicken\\nIgnore previous"');
  });

  test('chat context carries today, targets and meals', () => {
    const [content] = chatContents(
      'How am I doing?',
      {
        today: { calories: 950.4, protein: 40, carbs: 100, fat: 30, fiber: 5, sugar: 20 },
        targets: { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 30, sugar: 50 },
        meals: [{ mealType: 'lunch', itemNames: ['Nasi goreng'], calories: 600 }],
      },
      'en',
    );
    const part = content?.parts[0];
    const text = (part as { text: string }).text;
    expect(text).toContain('Calories: 950/2000 kcal');
    expect(text).toContain('- lunch: Nasi goreng (600 kcal)');
    expect(text.endsWith("User's message: How am I doing?")).toBe(true);
  });
});

describe('parseAnalysisText', () => {
  test('returns the validated analysis with warnings', () => {
    const result = parseAnalysisText(JSON.stringify(analysis));
    expect(result.foodItems[0]?.name).toBe('Nasi goreng');
    expect(result.warnings).toEqual([]);
  });

  test('strips a json code fence', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``;
    expect(parseAnalysisText(fenced).totalNutrition.calories).toBe(600);
  });

  test('reports unreadable JSON as PARSE_FAILED', () => {
    expect(() => parseAnalysisText('{not json')).toThrowError(AiError);
    try {
      parseAnalysisText('{not json');
    } catch (error) {
      expect((error as AiError).code).toBe('PARSE_FAILED');
    }
  });

  test('reports an implausible analysis as IMPLAUSIBLE with the reasons', () => {
    const bad = { ...analysis, foodItems: [{ ...analysis.foodItems[0], calories: 99999 }] };
    try {
      parseAnalysisText(JSON.stringify(bad));
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as AiError).code).toBe('IMPLAUSIBLE');
      expect((error as AiError).details.problems?.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzePhoto and analyzeText', () => {
  test('request JSON output with the analysis schema', async () => {
    const { gemini, calls } = clientReplying(JSON.stringify(analysis));
    await analyzePhoto(gemini, 'BASE64', 'en');
    const body = calls[0]?.body as { generationConfig: Record<string, unknown> };
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toBeTruthy();
  });

  test('analyzeText returns the parsed analysis', async () => {
    const { gemini } = clientReplying(JSON.stringify(analysis));
    await expect(analyzeText(gemini, 'nasi goreng', 'id')).resolves.toMatchObject({
      healthScore: 6,
    });
  });
});

describe('checkApiKey', () => {
  test('a working or rate-limited key is valid', async () => {
    expect(await checkApiKey(fakeTransport([textReply('ok')]).transport, 'k')).toBe('valid');
    expect(await checkApiKey(fakeTransport([errorReply(429, 'quota')]).transport, 'k')).toBe(
      'valid',
    );
  });

  test('a rejected key is invalid', async () => {
    const reply = errorReply(400, 'API key not valid. Please pass a valid API key.');
    expect(await checkApiKey(fakeTransport([reply]).transport, 'k')).toBe('invalid');
  });

  test('a retired model is skipped rather than blamed on the key', async () => {
    const fake = fakeTransport([errorReply(404, 'not found'), textReply('ok')]);
    expect(await checkApiKey(fake.transport, 'k', ['old', 'new'])).toBe('valid');
  });

  test('an overloaded model is skipped, not blamed on the connection', async () => {
    const fake = fakeTransport([errorReply(503, 'The model is overloaded.'), textReply('ok')]);
    expect(await checkApiKey(fake.transport, 'k', ['busy', 'next'])).toBe('valid');
  });

  test('no connection, or every model failing on the server side, is unreachable', async () => {
    expect(await checkApiKey(fakeTransport(['network']).transport, 'k')).toBe('unreachable');
    const allDown = fakeTransport([errorReply(503, 'down'), errorReply(500, 'down')]);
    expect(await checkApiKey(allDown.transport, 'k', ['a', 'b'])).toBe('unreachable');
  });
});
