/* ============================================
   NutriSnap — Model Candidates
   Pure. Google retires model IDs on a regular cadence; without a
   fallback the app fails with an opaque error and no way forward.
   Ordered best-first.
   ============================================ */

export const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest'
];

/**
 * Does this error mean "this model ID is not usable", as opposed to
 * a rate limit or a bad key? Only the former is worth retrying with
 * a different model.
 */
export function isModelUnavailableError(status, message) {
  const text = String(message || '');
  if (/API_KEY|PERMISSION_DENIED/i.test(text)) return false;
  if (status === 404) return true;
  if (status === 400 && /model/i.test(text)) return true;
  return false;
}

/**
 * Is this a model the fallback chain still knows how to advance from?
 * A model ID persisted by an older build may have been dropped from the
 * list since, and nextModel() cannot advance from one it does not know.
 */
export function isKnownModel(model) {
  return MODEL_CANDIDATES.includes(model);
}

/** The next candidate after `current`, or null if exhausted. */
export function nextModel(current, candidates = MODEL_CANDIDATES) {
  const index = candidates.indexOf(current);
  if (index === -1 || index === candidates.length - 1) return null;
  return candidates[index + 1];
}
