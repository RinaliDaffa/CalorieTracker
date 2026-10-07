import { type Analysis, validateAnalysis } from '@nutrisnap/core';
import { AiError } from './errors';
import { extractMessage, GEMINI_BASE, isAuthError } from './gemini';
import { isModelUnavailableError, MODEL_CANDIDATES } from './models';
import {
  ANALYSIS_SCHEMA,
  type ChatContext,
  chatContents,
  photoAnalysisContents,
  textAnalysisContents,
} from './prompts';
import type { GeminiClient, Lang, Transport, TransportResponse } from './types';

export interface AnalysisOutcome extends Analysis {
  warnings: string[];
}

const FENCE = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i;

export function parseAnalysisText(text: string): AnalysisOutcome {
  const fenced = FENCE.exec(text);
  const cleaned = fenced ? (fenced[1] ?? '') : text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiError('PARSE_FAILED', 'The model response was not valid JSON.');
  }
  const check = validateAnalysis(parsed);
  if (!check.ok) {
    throw new AiError('IMPLAUSIBLE', check.errors.join(' '), { problems: check.errors });
  }
  return { ...check.value, warnings: check.warnings };
}

// Thinking models spend output tokens before answering; a small ceiling can
// return an empty answer on a large meal. Unbounded thinking on a photo can
// also outlast mobile Safari, which drops a request that stays silent for about
// a minute, so the budget is capped well below the output ceiling.
const ANALYSIS_CONFIG = {
  responseSchema: ANALYSIS_SCHEMA,
  maxOutputTokens: 8192,
  thinkingBudget: 1024,
};

export async function analyzePhoto(
  client: GeminiClient,
  base64Jpeg: string,
  lang: Lang,
): Promise<AnalysisOutcome> {
  return parseAnalysisText(
    await client.generate(photoAnalysisContents(base64Jpeg, lang), ANALYSIS_CONFIG),
  );
}

export async function analyzeText(
  client: GeminiClient,
  description: string,
  lang: Lang,
): Promise<AnalysisOutcome> {
  return parseAnalysisText(
    await client.generate(textAnalysisContents(description, lang), ANALYSIS_CONFIG),
  );
}

export function chatReply(
  client: GeminiClient,
  message: string,
  ctx: ChatContext,
  lang: Lang,
): Promise<string> {
  return client.generate(chatContents(message, ctx, lang), {
    temperature: 0.7,
    maxOutputTokens: 2048,
  });
}

export type KeyCheck = 'valid' | 'invalid' | 'unreachable';

/**
 * Any 200 or 429 proves the key works; the answer text is irrelevant, which
 * matters because thinking models may return no text for a tiny budget.
 */
export async function checkApiKey(
  transport: Transport,
  key: string,
  candidates: readonly string[] = MODEL_CANDIDATES,
): Promise<KeyCheck> {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Reply with the word ok.' }] }],
    generationConfig: { maxOutputTokens: 16 },
  });
  for (const model of candidates) {
    let response: TransportResponse;
    try {
      response = await transport(`${GEMINI_BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
      });
    } catch {
      return 'unreachable';
    }
    if (response.ok || response.status === 429) return 'valid';
    const message = extractMessage(await response.json().catch(() => ({})));
    if (isAuthError(response.status, message)) return 'invalid';
    if (isModelUnavailableError(response.status, message)) continue;
    // An overloaded model (5xx) says nothing about the key: ask the next one.
    if (response.status >= 500) continue;
    return 'invalid';
  }
  return 'unreachable';
}
