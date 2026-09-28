import { describe, expect, test } from 'vitest';
import { greetingAt, mealTypeAt } from './mealtime';

const at = (h: number, m = 0) => new Date(2026, 8, 28, h, m);

describe('mealTypeAt keeps the legacy boundaries', () => {
  test.each([
    [0, 30, 'snack'],
    [4, 59, 'snack'],
    [5, 0, 'breakfast'],
    [9, 59, 'breakfast'],
    [10, 0, 'lunch'],
    [14, 59, 'lunch'],
    [15, 0, 'dinner'],
    [20, 59, 'dinner'],
    [21, 0, 'snack'],
    [23, 59, 'snack'],
  ] as const)('%i:%i is %s', (h, m, expected) => {
    expect(mealTypeAt(at(h, m))).toBe(expected);
  });
});

describe('greetingAt', () => {
  test.each([
    [0, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
  ] as const)('%i:00 is %s', (h, expected) => {
    expect(greetingAt(at(h))).toBe(expected);
  });
});
