import { LEGACY_DB_NAME, openExisting } from './open';
import type { LegacyDump } from './types';

export { LEGACY_DB_NAME };

const STORES = ['meals', 'photos', 'goals', 'settings', 'favorites', 'chats'] as const;

function getAll(database: IDBDatabase, store: string): Promise<unknown[]> {
  if (!database.objectStoreNames.contains(store)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const request = database.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(request.error);
  });
}

/** Read-only snapshot of the legacy database, or null when there is none. */
export async function readLegacy(
  name: string = LEGACY_DB_NAME,
  factory: IDBFactory = indexedDB,
): Promise<LegacyDump | null> {
  const database = await openExisting(factory, name);
  if (!database) return null;
  try {
    const [meals, photos, goals, settings, favorites, chats] = await Promise.all(
      STORES.map((store) => getAll(database, store)),
    );
    return { meals, photos, goals, settings, favorites, chats } as LegacyDump;
  } finally {
    database.close();
  }
}
