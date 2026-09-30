import { getMeta } from '@/db/meta';
import { db } from '@/db/schema';
import { applyTheme } from '@/lib/theme';
import { platform } from '@/platform';
import type { ImportOutcome } from './import';
import { legacyExists } from './open';

let outcome: ImportOutcome | null = null;

/**
 * The import code (read, map, thumbnails, JSON) runs at most once per device,
 * so it is a separate chunk that loads only when there is something to import.
 * Every other boot pays for two cheap checks and nothing else.
 */
export async function runLegacyImport(): Promise<void> {
  try {
    if ((await getMeta(db, 'legacyImportedAt')) !== undefined) {
      outcome = { status: 'already' };
      return;
    }
    if (!(await legacyExists())) {
      outcome = { status: 'none' };
      return;
    }
    const { importLegacyIfPresent } = await import('./import');
    outcome = await importLegacyIfPresent(db, {
      makeThumb: (blob) => platform().image.thumbnail(blob),
      onTheme: (theme) => applyTheme(theme),
    });
  } catch (error) {
    outcome = { status: 'failed', error };
  }
}

/** Returns the launch outcome once, so the notice is shown a single time. */
export function takeLegacyOutcome(): ImportOutcome | null {
  const value = outcome;
  outcome = null;
  return value;
}

export async function downloadLegacyBackup(): Promise<void> {
  const [{ readLegacy }, { legacyToJson }] = await Promise.all([
    import('./read'),
    import('./json'),
  ]);
  const dump = await readLegacy();
  if (!dump) return;
  platform().files.saveText(
    'nutrisnap-legacy-backup.json',
    await legacyToJson(dump),
    'application/json',
  );
}
