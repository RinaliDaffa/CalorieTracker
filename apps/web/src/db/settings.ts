import type { NutriSnapDb } from './schema';

export type SettingKey = 'apiKey' | 'activeModel' | 'onboarded';

export async function getSetting<T>(d: NutriSnapDb, key: SettingKey): Promise<T | undefined> {
  return (await d.settings.get(key))?.value as T | undefined;
}

export async function setSetting(
  d: NutriSnapDb,
  key: SettingKey,
  value: unknown,
  now: number = Date.now(),
): Promise<void> {
  await d.settings.put({ key, value, updatedAt: now });
}

export async function isOnboarded(d: NutriSnapDb): Promise<boolean> {
  return (await getSetting<boolean>(d, 'onboarded')) === true;
}
