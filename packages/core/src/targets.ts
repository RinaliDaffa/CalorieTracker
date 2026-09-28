import type { DateKey } from './dates';
import { NUTRIENT_KEYS, type Nutrients } from './types';

export type Targets = Nutrients;

export const DEFAULT_TARGETS: Targets = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 30,
  sugar: 50,
};

export type TargetReason = 'default' | 'formula' | 'adaptive' | 'manual';

export interface TargetEntry {
  effectiveFrom: DateKey;
  values: Targets;
  reason: TargetReason;
  updatedAt: number;
}

/**
 * The target in force on `key`: the latest entry that started on or before it.
 * A day is always judged against its own target, so a new target never
 * rewrites the past.
 */
export function targetOn(entries: readonly TargetEntry[], key: DateKey): Targets {
  let best: TargetEntry | undefined;
  for (const entry of entries) {
    if (entry.effectiveFrom > key) continue;
    if (
      !best ||
      entry.effectiveFrom > best.effectiveFrom ||
      (entry.effectiveFrom === best.effectiveFrom && entry.updatedAt > best.updatedAt)
    ) {
      best = entry;
    }
  }
  return { ...(best ? best.values : DEFAULT_TARGETS) };
}

export function sameTargets(a: Targets, b: Targets): boolean {
  return NUTRIENT_KEYS.every((key) => a[key] === b[key]);
}

/** Input bounds carried over from the legacy goals form. */
export const TARGET_RANGES: Record<keyof Targets, { min: number; max: number }> = {
  calories: { min: 500, max: 10000 },
  protein: { min: 10, max: 500 },
  carbs: { min: 10, max: 1000 },
  fat: { min: 10, max: 300 },
  fiber: { min: 5, max: 100 },
  sugar: { min: 5, max: 200 },
};

export type TargetValidation =
  | { ok: true; value: Targets }
  | { ok: false; invalid: (keyof Targets)[] };

export function validateTargets(input: Record<keyof Targets, number>): TargetValidation {
  const invalid = NUTRIENT_KEYS.filter((key) => {
    const value = input[key];
    const range = TARGET_RANGES[key];
    return !Number.isFinite(value) || value < range.min || value > range.max;
  });
  if (invalid.length > 0) return { ok: false, invalid };
  return {
    ok: true,
    value: {
      calories: Math.round(input.calories),
      protein: Math.round(input.protein),
      carbs: Math.round(input.carbs),
      fat: Math.round(input.fat),
      fiber: Math.round(input.fiber),
      sugar: Math.round(input.sugar),
    },
  };
}
