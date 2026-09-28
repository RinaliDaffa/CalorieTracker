import { expect, test } from 'vitest';
import { healthBand, progressPercent } from './progress';

test('progressPercent rounds and guards a zero goal', () => {
  expect(progressPercent(500, 2000)).toBe(25);
  expect(progressPercent(2500, 2000)).toBe(125);
  expect(progressPercent(100, 0)).toBe(0);
});

test('healthBand matches the legacy labels', () => {
  expect([10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(healthBand)).toEqual([
    'excellent',
    'excellent',
    'great',
    'great',
    'good',
    'good',
    'fair',
    'fair',
    'poor',
    'poor',
  ]);
});
