import { db } from '@/db/schema';
import { applyTheme } from '@/lib/theme';
import { platform } from '@/platform';
import { type ImportOutcome, importLegacyIfPresent } from './import';
import { legacyToJson } from './json';
import { readLegacy } from './read';

let outcome: ImportOutcome | null = null;

export async function runLegacyImport(): Promise<void> {
  outcome = await importLegacyIfPresent(db, {
    makeThumb: (blob) => platform().image.thumbnail(blob),
    onTheme: (theme) => applyTheme(theme),
  });
}

/** Returns the launch outcome once, so the notice is shown a single time. */
export function takeLegacyOutcome(): ImportOutcome | null {
  const value = outcome;
  outcome = null;
  return value;
}

export async function downloadLegacyBackup(): Promise<void> {
  const dump = await readLegacy();
  if (!dump) return;
  platform().files.saveText(
    'nutrisnap-legacy-backup.json',
    await legacyToJson(dump),
    'application/json',
  );
}
