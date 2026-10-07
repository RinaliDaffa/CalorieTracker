import { createGeminiClient, type Transport } from '@nutrisnap/ai';
import { db } from '@/db/schema';
import { getSetting, setSetting } from '@/db/settings';

// A stalled mobile connection must end in a "network" error the user can retry,
// not an "Analyzing…" spinner that never stops.
const REQUEST_TIMEOUT_MS = 90_000;

// AbortSignal.timeout is missing before Safari 16 (iOS 15); without this fallback every
// request there would throw before leaving the phone and read as "can't reach Google".
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export const fetchTransport: Transport = async (url, init) => {
  const response = await fetch(url, { ...init, signal: timeoutSignal(REQUEST_TIMEOUT_MS) });
  return { ok: response.ok, status: response.status, json: () => response.json() };
};

export const gemini = createGeminiClient({
  transport: fetchTransport,
  getApiKey: () => getSetting<string>(db, 'apiKey'),
  getModel: () => getSetting<string>(db, 'activeModel'),
  // Best-effort: a failed settings write must never lose a successful answer.
  onModelResolved: (model) => setSetting(db, 'activeModel', model).catch(() => {}),
});
