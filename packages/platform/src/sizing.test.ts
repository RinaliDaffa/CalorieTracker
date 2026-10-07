import { expect, test } from 'vitest';
import { fitWithin } from './sizing';

test('shrinks the longest edge to the limit, keeping the aspect ratio', () => {
  expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
  expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
});

test('never enlarges a small image', () => {
  expect(fitWithin(640, 480, 1024)).toEqual({ width: 640, height: 480 });
});

test('never returns a zero dimension', () => {
  expect(fitWithin(10000, 1, 256)).toEqual({ width: 256, height: 1 });
});
