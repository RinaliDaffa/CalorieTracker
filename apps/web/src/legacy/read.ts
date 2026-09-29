import type { LegacyDump } from './types';

export const LEGACY_DB_NAME = 'nutrisnap';
const STORES = ['meals', 'photos', 'goals', 'settings', 'favorites', 'chats'] as const;

/**
 * Opens an existing database without creating one: if the open would create
 * it (oldVersion 0), the upgrade is aborted, which discards the new database.
 */
function openExisting(factory: IDBFactory, name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name);
    let creating = false;
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        creating = true;
        request.transaction?.abort();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      if (creating) {
        event.preventDefault();
        resolve(null);
      } else {
        reject(request.error);
      }
    };
    request.onblocked = () => reject(new Error('Legacy database is blocked'));
  });
}

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
