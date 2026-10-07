import { expect, test } from 'vitest';
import { uuidv7, uuidv7At } from './ids';

const zeros = (bytes: Uint8Array) => bytes.fill(0);

test('encodes the millisecond timestamp, version 7 and the RFC variant', () => {
  expect(uuidv7At(0x018912345678, zeros)).toBe('01891234-5678-7000-8000-000000000000');
});

test('ids sort by creation time', () => {
  expect(uuidv7At(1000) < uuidv7At(2000)).toBe(true);
});

test('uuidv7 produces the canonical shape', () => {
  expect(uuidv7()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
