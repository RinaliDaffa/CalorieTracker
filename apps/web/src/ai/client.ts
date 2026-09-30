import { createGeminiClient, type Transport } from '@nutrisnap/ai';
import { db } from '@/db/schema';
import { getSetting, setSetting } from '@/db/settings';

export const fetchTransport: Transport = async (url, init) => {
  const response = await fetch(url, init);
  return { ok: response.ok, status: response.status, json: () => response.json() };
};

export const gemini = createGeminiClient({
  transport: fetchTransport,
  getApiKey: () => getSetting<string>(db, 'apiKey'),
  getModel: () => getSetting<string>(db, 'activeModel'),
  // Best-effort: a failed settings write must never lose a successful answer.
  onModelResolved: (model) => setSetting(db, 'activeModel', model).catch(() => {}),
});
