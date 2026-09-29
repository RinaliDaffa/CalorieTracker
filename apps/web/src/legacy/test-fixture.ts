import type { LegacyDump } from './types';

/** Builds a database with the legacy app's exact schema (db.js, version 1). */
export function createLegacyFixture(
  factory: IDBFactory,
  name: string,
  data: Partial<LegacyDump>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('meals', { keyPath: 'id' }).createIndex('date', 'date');
      database.createObjectStore('photos', { keyPath: 'mealId' });
      database.createObjectStore('goals', { keyPath: 'id' });
      database.createObjectStore('settings', { keyPath: 'key' });
      database.createObjectStore('favorites', { keyPath: 'id' });
      database.createObjectStore('chats', { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const stores = ['meals', 'photos', 'goals', 'settings', 'favorites', 'chats'] as const;
      const tx = database.transaction([...stores], 'readwrite');
      for (const store of stores) {
        for (const record of data[store] ?? []) tx.objectStore(store).put(record);
      }
      tx.oncomplete = () => {
        database.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}
