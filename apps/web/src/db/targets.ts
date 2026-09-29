import { type DateKey, type TargetReason, type Targets, targetOn, uuidv7At } from '@nutrisnap/core';
import type { NutriSnapDb } from './schema';

export async function currentTargets(d: NutriSnapDb, date: DateKey): Promise<Targets> {
  const entries = await d.targets.filter((t) => t.deletedAt === undefined).toArray();
  return targetOn(entries, date);
}

/** Several saves on one day update that day's record instead of piling up. */
export async function setTargets(
  d: NutriSnapDb,
  values: Targets,
  reason: TargetReason,
  effectiveFrom: DateKey,
  now: number = Date.now(),
): Promise<void> {
  await d.transaction('rw', d.targets, async () => {
    const existing = await d.targets.where('effectiveFrom').equals(effectiveFrom).first();
    if (existing) {
      await d.targets.update(existing.id, { values, reason, updatedAt: now });
    } else {
      await d.targets.add({ id: uuidv7At(now), effectiveFrom, values, reason, updatedAt: now });
    }
  });
}
