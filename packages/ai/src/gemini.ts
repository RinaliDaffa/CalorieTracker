import { AiError } from './errors';
import {
  isModelUnavailableError,
  MODEL_CANDIDATES,
  nextModel,
  quotaWindow,
  retryDelayMs,
} from './models';
import type {
  ClientOptions,
  GeminiClient,
  GeminiContent,
  GenerateConfig,
  TransportResponse,
} from './types';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Longest per-minute wait the client absorbs silently before surfacing RATE_LIMITED. */
const MAX_AUTO_WAIT_MS = 10_000;

export function extractMessage(body: unknown): string {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === 'string' ? message : '';
}

export function isAuthError(status: number, message: string): boolean {
  return (
    (status === 400 || status === 401 || status === 403) &&
    /API_KEY|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)
  );
}

function requestBody(contents: GeminiContent[], config: GenerateConfig): string {
  const generationConfig: Record<string, unknown> = {
    temperature: config.temperature ?? 0.3,
    maxOutputTokens: config.maxOutputTokens ?? 2048,
  };
  if (config.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = config.responseSchema;
  }
  return JSON.stringify({ contents, generationConfig });
}

function readText(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  return (parts ?? []).map((part) => (typeof part.text === 'string' ? part.text : '')).join('');
}

export function createGeminiClient(options: ClientOptions): GeminiClient {
  const candidates = options.candidates ?? MODEL_CANDIDATES;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  return {
    async generate(contents, config = {}) {
      const key = await options.getApiKey();
      if (!key) throw new AiError('NO_KEY', 'No API key configured.');

      const stored = await options.getModel?.();
      let model: string | null =
        stored && candidates.includes(stored) ? stored : (candidates[0] ?? null);
      const body = requestBody(contents, config);
      let waited = false;
      // A model reached by skipping a daily-exhausted one is a detour, not
      // the new default: tomorrow the better model has quota again.
      let persistable = true;

      while (model) {
        let response: TransportResponse;
        try {
          response = await options.transport(`${GEMINI_BASE}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body,
          });
        } catch {
          throw new AiError('NETWORK', 'Network request failed.');
        }

        if (response.ok) {
          const text = readText(await response.json());
          if (!text.trim()) throw new AiError('EMPTY_RESPONSE', 'The model returned no text.');
          if (persistable && model !== stored) await options.onModelResolved?.(model);
          return text;
        }

        const errorBody = await response.json().catch(() => ({}));
        const message = extractMessage(errorBody);

        if (response.status === 429) {
          if (quotaWindow(errorBody) === 'day') {
            const next = nextModel(model, candidates);
            if (!next) throw new AiError('QUOTA_EXHAUSTED', message, { status: 429 });
            model = next;
            persistable = false;
            continue;
          }
          const delay = retryDelayMs(errorBody) ?? 5000;
          if (!waited && delay <= MAX_AUTO_WAIT_MS) {
            waited = true;
            await sleep(delay);
            continue;
          }
          throw new AiError('RATE_LIMITED', message, { status: 429, retryAfterMs: delay });
        }

        if (isAuthError(response.status, message)) {
          throw new AiError('INVALID_KEY', message, { status: response.status });
        }

        if (isModelUnavailableError(response.status, message)) {
          const next = nextModel(model, candidates);
          if (!next) throw new AiError('NO_MODEL', message, { status: response.status });
          model = next;
          continue;
        }

        // Overloaded or failing on Google's side is about this model right now, not the
        // request: try the next candidate, but don't remember it as the new default.
        if (response.status >= 500) {
          const next = nextModel(model, candidates);
          if (next) {
            model = next;
            persistable = false;
            continue;
          }
        }

        throw new AiError('HTTP', message || `HTTP ${response.status}`, {
          status: response.status,
        });
      }

      throw new AiError('NO_MODEL', 'No model candidates configured.');
    },
  };
}
