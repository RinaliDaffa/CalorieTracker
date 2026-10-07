import type { NutriSnapDb } from './schema';

export type MetaKey = 'legacyImportedAt';

export async function getMeta<T>(d: NutriSnapDb, key: MetaKey): Promise<T | undefined> {
  return (await d.meta.get(key))?.value as T | undefined;
}

export async function setMeta(d: NutriSnapDb, key: MetaKey, value: unknown): Promise<void> {
  await d.meta.put({ key, value });
}
