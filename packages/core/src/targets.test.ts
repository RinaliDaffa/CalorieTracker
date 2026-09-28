import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TARGETS,
  sameTargets,
  type TargetEntry,
  targetOn,
  validateTargets,
} from './targets';

const custom = { ...DEFAULT_TARGETS, calories: 1800 };

describe('targetOn', () => {
  test('falls back to defaults when nothing is stored', () => {
    expect(targetOn([], '2026-09-28')).toEqual(DEFAULT_TARGETS);
  });

  test('judges each day by the target in force on that day', () => {
    const entries: TargetEntry[] = [
      { effectiveFrom: '2026-09-10', values: custom, reason: 'manual', updatedAt: 1 },
    ];
    expect(targetOn(entries, '2026-09-09').calories).toBe(2000);
    expect(targetOn(entries, '2026-09-10').calories).toBe(1800);
    expect(targetOn(entries, '2026-12-01').calories).toBe(1800);
  });

  test('a later save wins a same-day tie', () => {
    const entries: TargetEntry[] = [
      { effectiveFrom: '2026-09-10', values: custom, reason: 'manual', updatedAt: 2 },
      {
        effectiveFrom: '2026-09-10',
        values: { ...custom, calories: 1500 },
        reason: 'manual',
        updatedAt: 1,
      },
    ];
    expect(targetOn(entries, '2026-09-10').calories).toBe(1800);
  });
});

describe('validateTargets', () => {
  test('accepts values in range and rounds them', () => {
    const result = validateTargets({ ...DEFAULT_TARGETS, protein: 120.4 });
    expect(result).toEqual({ ok: true, value: { ...DEFAULT_TARGETS, protein: 120 } });
  });

  test('names every field that is out of range or not a number', () => {
    const result = validateTargets({ ...DEFAULT_TARGETS, calories: 100, fat: Number.NaN });
    expect(result).toEqual({ ok: false, invalid: ['calories', 'fat'] });
  });

  test('sameTargets compares every nutrient', () => {
    expect(sameTargets(DEFAULT_TARGETS, { ...DEFAULT_TARGETS })).toBe(true);
    expect(sameTargets(DEFAULT_TARGETS, custom)).toBe(false);
  });
});
