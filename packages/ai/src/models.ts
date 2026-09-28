/**
 * Ordered best-first. Google retires model IDs on a regular cadence; the
 * `-latest` aliases move with them, and the pinned IDs are the fallback.
 *
 * Checked against https://ai.google.dev/gemini-api/docs/models on
 * 2026-09-28: the `gemini-flash-latest` / `gemini-flash-lite-latest`
 * aliases no longer appear as model-table rows (only as prose examples of
 * the naming pattern), so the current stable IDs are pinned first instead.
 * `gemini-2.0-flash` / `gemini-2.0-flash-lite` have since been shut down;
 * `gemini-2.5-flash` / `gemini-2.5-flash-lite` remain as older fallbacks.
 */
export const MODEL_CANDIDATES: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

/** "This model ID is not usable", as opposed to a rate limit or a bad key. */
export function isModelUnavailableError(status: number, message: string | undefined): boolean {
  const text = String(message ?? '');
  if (/API_KEY|PERMISSION_DENIED/i.test(text)) return false;
  if (status === 404) return true;
  return status === 400 && /model/i.test(text);
}

export function isKnownModel(model: unknown): model is string {
  return typeof model === 'string' && MODEL_CANDIDATES.includes(model);
}

export function nextModel(
  current: string,
  candidates: readonly string[] = MODEL_CANDIDATES,
): string | null {
  const index = candidates.indexOf(current);
  if (index === -1 || index === candidates.length - 1) return null;
  return candidates[index + 1] ?? null;
}

export type QuotaWindow = 'day' | 'minute' | 'unknown';

function serialize(body: unknown): string {
  try {
    return JSON.stringify(body) ?? '';
  } catch {
    return '';
  }
}

/** Free-tier limits are per model and per window; only a daily limit justifies switching model. */
export function quotaWindow(errorBody: unknown): QuotaWindow {
  const text = serialize(errorBody);
  if (/PerDay/i.test(text)) return 'day';
  if (/PerMinute/i.test(text)) return 'minute';
  return 'unknown';
}

export function retryDelayMs(errorBody: unknown): number | null {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(serialize(errorBody));
  return match ? Math.round(Number(match[1]) * 1000) : null;
}
