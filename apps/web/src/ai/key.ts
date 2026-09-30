import { db } from '@/db/schema';
import { setSetting } from '@/db/settings';
import { platform } from '@/platform';

export async function saveApiKey(key: string): Promise<void> {
  await setSetting(db, 'apiKey', key);
  await setSetting(db, 'onboarded', true);
  // Asked now, when there is data worth keeping; browsers tend to refuse an
  // ask made at first launch, and a refusal is not retried.
  void platform().storage.persist();
}
