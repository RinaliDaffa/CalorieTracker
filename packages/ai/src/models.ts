/**
 * Ordered best-first. Pinned stable IDs lead, per Google's own advice to use
 * specific stable models in production: `gemini-3.8-flash` and
 * `gemini-3.5-flash-lite` are the current GA Flash / Flash-Lite models;
 * `gemini-3.6-flash` is another stable Flash release with no shutdown date
 * and a free tier. `gemini-flash-latest` is the documented hot-swapped
 * alias (models page, "Model version name patterns → Latest"; changelog
 * 2026-05-19 confirms it currently points at `gemini-3.5-flash`) — kept
 * after the pinned IDs since it can move to a preview release. `gemini-2.5-flash`
 * / `gemini-2.5-flash-lite` are restricted (since 2026-09-18) to API keys
 * that used them before, so they're last-resort for legacy keys only.
 * `gemini-2.0-flash` / `gemini-2.0-flash-lite` are shut down and omitted.
 */
export const MODEL_CANDIDATES: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
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
