export const LEGACY_DB_NAME = 'nutrisnap';

/**
 * Opens an existing database without creating one: if the open would create
 * it (oldVersion 0), the upgrade is aborted, which discards the new database.
 */
export function openExisting(factory: IDBFactory, name: string): Promise<IDBDatabase | null> {
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

/** Cheap check that the legacy database exists, without reading or creating it. */
export async function legacyExists(
  name: string = LEGACY_DB_NAME,
  factory: IDBFactory = indexedDB,
): Promise<boolean> {
  const database = await openExisting(factory, name);
  database?.close();
  return database !== null;
}
