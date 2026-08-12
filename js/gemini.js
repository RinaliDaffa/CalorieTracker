/* ============================================
   NutriSnap — Gemini AI Module
   Food analysis and nutrition chat
   ============================================ */

let apiKey = null;

// ── Configure API Key ──
export function setApiKey(key) {
  apiKey = key;
}

export function getApiKey() {
  return apiKey;
}

// ── Gemini API Call ──
async function callGemini(contents, config = {}) {
  if (!apiKey) {
    throw new Error('API key not configured. Please add your Gemini API key in Settings.');
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Separate generation config from custom properties
  const { responseSchema, ...genConfig } = config;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      ...genConfig
    }
  };

  // Add response schema for structured output if provided
  if (responseSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = responseSchema;
  }

  console.log('Calling Gemini API...');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }
    if (response.status === 400 && err.error?.message?.includes('API_KEY')) {
      throw new Error('Invalid API key. Please check your key in Settings.');
    }
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from AI. Please try again.');
  }

  return text;
}

// ── Analyze Food Photo ──
export async function analyzeFood(base64Image) {
  const schema = {
    type: 'OBJECT',
    properties: {
      foodItems: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            servingSize: { type: 'STRING' },
            calories: { type: 'NUMBER' },
            protein: { type: 'NUMBER' },
            carbs: { type: 'NUMBER' },
            fat: { type: 'NUMBER' },
            fiber: { type: 'NUMBER' },
            sugar: { type: 'NUMBER' }
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fat']
        }
      },
      totalNutrition: {
        type: 'OBJECT',
        properties: {
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          fiber: { type: 'NUMBER' },
          sugar: { type: 'NUMBER' }
        },
        required: ['calories', 'protein', 'carbs', 'fat']
      },
      healthScore: { type: 'INTEGER' },
      aiTips: { type: 'STRING' },
      mealDescription: { type: 'STRING' }
    },
    required: ['foodItems', 'totalNutrition', 'healthScore', 'aiTips', 'mealDescription']
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an expert nutritionist AI. Analyze this food photo carefully.

For each food item visible:
1. Identify the food item and estimate the serving size
2. Provide estimated nutritional values (calories in kcal, protein/carbs/fat/fiber/sugar in grams)

Also provide:
- totalNutrition: sum of all food items
- healthScore: 1-10 rating (10 = very healthy)
- aiTips: brief personalized tip about this meal (max 2 sentences)
- mealDescription: brief description of the overall meal

Be as accurate as possible with portion estimates. If uncertain, provide your best estimate based on typical serving sizes. Round values to reasonable numbers.`
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]
    }
  ];

  const result = await callGemini(contents, { responseSchema: schema });

  try {
    return JSON.parse(result);
  } catch (e) {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

// ── Analyze Food by Text Description ──
export async function analyzeFoodByText(description) {
  const schema = {
    type: 'OBJECT',
    properties: {
      foodItems: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            servingSize: { type: 'STRING' },
            calories: { type: 'NUMBER' },
            protein: { type: 'NUMBER' },
            carbs: { type: 'NUMBER' },
            fat: { type: 'NUMBER' },
            fiber: { type: 'NUMBER' },
            sugar: { type: 'NUMBER' }
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fat']
        }
      },
      totalNutrition: {
        type: 'OBJECT',
        properties: {
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          fiber: { type: 'NUMBER' },
          sugar: { type: 'NUMBER' }
        },
        required: ['calories', 'protein', 'carbs', 'fat']
      },
      healthScore: { type: 'INTEGER' },
      aiTips: { type: 'STRING' },
      mealDescription: { type: 'STRING' }
    },
    required: ['foodItems', 'totalNutrition', 'healthScore', 'aiTips', 'mealDescription']
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an expert nutritionist AI. The user describes their meal as: "${description}"

For each food item mentioned:
1. Identify the food item and estimate a typical serving size
2. Provide estimated nutritional values (calories in kcal, protein/carbs/fat/fiber/sugar in grams)

Also provide:
- totalNutrition: sum of all food items
- healthScore: 1-10 rating (10 = very healthy)
- aiTips: brief personalized tip about this meal (max 2 sentences)
- mealDescription: brief description of the meal

Use typical portion sizes and be reasonably accurate.`
        }
      ]
    }
  ];

  const result = await callGemini(contents, { responseSchema: schema });

  try {
    return JSON.parse(result);
  } catch (e) {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

// ── Chat with AI ──
export async function chatWithAI(userMessage, context = {}) {
  const { todayNutrition, goals, recentMeals } = context;

  let systemContext = `You are NutriSnap AI, a friendly and knowledgeable personal nutrition assistant. You help the user track and improve their diet.

Keep your responses concise, helpful, and encouraging. Use emoji occasionally to be friendly. Format responses clearly.`;

  if (todayNutrition) {
    systemContext += `\n\nToday's intake so far:
- Calories: ${todayNutrition.calories}/${goals?.calories || 2000} kcal
- Protein: ${todayNutrition.protein}/${goals?.protein || 150}g
- Carbs: ${todayNutrition.carbs}/${goals?.carbs || 250}g
- Fat: ${todayNutrition.fat}/${goals?.fat || 65}g`;
  }

  if (recentMeals && recentMeals.length > 0) {
    systemContext += `\n\nRecent meals today:`;
    recentMeals.forEach(m => {
      const items = (m.foodItems || []).map(f => f.name).join(', ');
      systemContext += `\n- ${m.mealType}: ${items} (${m.nutrition?.calories || 0} kcal)`;
    });
  }

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `${systemContext}\n\nUser's message: ${userMessage}`
        }
      ]
    }
  ];

  return await callGemini(contents, { temperature: 0.7, maxOutputTokens: 1024 });
}

// ── Validate API Key ──
export async function validateApiKey(key) {
  const tempKey = apiKey;
  apiKey = key;

  try {
    const contents = [
      {
        role: 'user',
        parts: [{ text: 'Respond with just the word ok' }]
      }
    ];

    await callGemini(contents, { maxOutputTokens: 10 });
    apiKey = tempKey; // Restore (the real save happens elsewhere)
    console.log('API key validation succeeded');
    return true;
  } catch (e) {
    console.error('API key validation failed:', e.message);
    apiKey = tempKey;
    return false;
  }
}
