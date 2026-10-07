import { createGeminiClient, type Transport } from '@nutrisnap/ai';
import { db } from '@/db/schema';
import { getSetting, setSetting } from '@/db/settings';

// A stalled mobile connection must end in a "network" error the user can retry,
// not an "Analyzing…" spinner that never stops.
const REQUEST_TIMEOUT_MS = 90_000;

export const fetchTransport: Transport = async (url, init) => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  return { ok: response.ok, status: response.status, json: () => response.json() };
};

export const gemini = createGeminiClient({
  transport: fetchTransport,
  getApiKey: () => getSetting<string>(db, 'apiKey'),
  getModel: () => getSetting<string>(db, 'activeModel'),
  // Best-effort: a failed settings write must never lose a successful answer.
  onModelResolved: (model) => setSetting(db, 'activeModel', model).catch(() => {}),
});
