import type { NutriSnapDb } from './schema';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Undo only needs tombstones briefly; SP5 sync keeps its own retention. */
export async function purgeTombstones(
  d: NutriSnapDb,
  now: number = Date.now(),
  maxAgeMs: number = THIRTY_DAYS,
): Promise<number> {
  const cutoff = now - maxAgeMs;
  const expired = (r: { deletedAt?: number }) => r.deletedAt !== undefined && r.deletedAt < cutoff;
  let removed = 0;
  await d.transaction('rw', [d.meals, d.photos, d.favorites, d.chats], async () => {
    removed += await d.meals.filter(expired).delete();
    removed += await d.photos.filter(expired).delete();
    removed += await d.favorites.filter(expired).delete();
    removed += await d.chats.filter(expired).delete();
  });
  return removed;
}
