import { toDateKey } from '@nutrisnap/core';
import { getMeta } from '@/db/meta';
import type { NutriSnapDb, PhotoRecord } from '@/db/schema';
import { mapLegacy } from './map';
import { LEGACY_DB_NAME, readLegacy } from './read';
import type { LegacyDump } from './types';

export interface ImportDeps {
  makeThumb: (blob: Blob) => Promise<Blob>;
  now?: number;
  onTheme?: (theme: 'dark' | 'light') => void;
}

export type ImportOutcome =
  | {
      status: 'imported';
      counts: { meals: number; photos: number; favorites: number; chats: number };
    }
  | { status: 'none' }
  | { status: 'already' }
  | { status: 'failed'; error: unknown };

/**
 * Thrown inside the write transaction when another run already committed the
 * import first, and caught right outside it — never leaks past this module.
 */
class AlreadyImported extends Error {}

export async function importLegacyDump(
  d: NutriSnapDb,
  dump: LegacyDump,
  deps: ImportDeps,
): Promise<ImportOutcome> {
  try {
    // Cheap pre-check: skips mapping and thumbnail work in the common case.
    if ((await getMeta(d, 'legacyImportedAt')) !== undefined) return { status: 'already' };
    const now = deps.now ?? Date.now();
    const mapped = mapLegacy(dump, { now, today: toDateKey(new Date(now)) });

    // Thumbnails need a canvas, which cannot run inside an IndexedDB
    // transaction, so they are made first. A failed thumbnail reuses the photo.
    const photos: PhotoRecord[] = [];
    for (const link of mapped.photoLinks) {
      const thumb = await deps.makeThumb(link.blob).catch(() => link.blob);
      photos.push({
        id: link.photoId,
        full: link.blob,
        thumb,
        takenAt: link.takenAt,
        updatedAt: now,
      });
    }

    try {
      await d.transaction(
        'rw',
        [d.meals, d.photos, d.favorites, d.chats, d.targets, d.settings, d.meta],
        async () => {
          // Re-check inside the transaction: two concurrent runs (two tabs
          // booting together, a double-clicked JSON import) can both pass the
          // pre-check before either commits, which would double every record.
          if ((await d.meta.get('legacyImportedAt')) !== undefined) throw new AlreadyImported();
          await d.meals.bulkAdd(mapped.meals);
          await d.photos.bulkAdd(photos);
          await d.favorites.bulkAdd(mapped.favorites);
          await d.chats.bulkAdd(mapped.chats);
          await d.targets.bulkAdd(mapped.targets);
          // A key saved in the new app is newer than the legacy one.
          if (mapped.settings.apiKey && !(await d.settings.get('apiKey'))) {
            await d.settings.put({
              key: 'apiKey',
              value: mapped.settings.apiKey,
              updatedAt: now,
            });
            await d.settings.put({ key: 'onboarded', value: true, updatedAt: now });
          }
          if (mapped.settings.activeModel && !(await d.settings.get('activeModel'))) {
            await d.settings.put({
              key: 'activeModel',
              value: mapped.settings.activeModel,
              updatedAt: now,
            });
          }
          await d.meta.put({ key: 'legacyImportedAt', value: now });
        },
      );
    } catch (error) {
      if (error instanceof AlreadyImported) return { status: 'already' };
      throw error;
    }

    if (mapped.theme) deps.onTheme?.(mapped.theme);
    return {
      status: 'imported',
      counts: {
        meals: mapped.meals.length,
        photos: photos.length,
        favorites: mapped.favorites.length,
        chats: mapped.chats.length,
      },
    };
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function importLegacyIfPresent(
  d: NutriSnapDb,
  deps: ImportDeps & { legacyName?: string; factory?: IDBFactory },
): Promise<ImportOutcome> {
  try {
    if ((await getMeta(d, 'legacyImportedAt')) !== undefined) return { status: 'already' };
  } catch (error) {
    return { status: 'failed', error };
  }
  let dump: LegacyDump | null;
  try {
    dump = await readLegacy(deps.legacyName ?? LEGACY_DB_NAME, deps.factory ?? indexedDB);
  } catch (error) {
    return { status: 'failed', error };
  }
  if (!dump) return { status: 'none' };
  return importLegacyDump(d, dump, deps);
}
