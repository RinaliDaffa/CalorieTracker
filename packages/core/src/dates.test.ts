import { describe, expect, test } from 'vitest';
import {
  addDays,
  isDateKey,
  monthGrid,
  parseDateKey,
  shiftMonth,
  toDateKey,
  weekKeys,
} from './dates';

describe('date keys', () => {
  test('toDateKey uses local time and pads', () => {
    expect(toDateKey(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
  });

  test('a meal at 00:30 belongs to the new day', () => {
    expect(toDateKey(new Date(2026, 8, 29, 0, 30))).toBe('2026-09-29');
  });

  test('parseDateKey round-trips', () => {
    expect(toDateKey(parseDateKey('2026-02-28'))).toBe('2026-02-28');
  });

  test('isDateKey rejects impossible dates and other shapes', () => {
    expect(isDateKey('2026-09-28')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('28-09-2026')).toBe(false);
    expect(isDateKey(20260928)).toBe(false);
  });

  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('weeks and months', () => {
  test('weekKeys starts on Monday by default', () => {
    expect(weekKeys('2026-09-30')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  test('weekKeys can start on Sunday', () => {
    expect(weekKeys('2026-09-30', 0)[0]).toBe('2026-09-27');
  });

  test('monthGrid covers whole weeks and marks days outside the month', () => {
    const cells = monthGrid(2026, 8);
    expect(cells).toHaveLength(35);
    expect(cells[0]).toEqual({ key: '2026-08-31', day: 31, inMonth: false });
    expect(cells[1]).toEqual({ key: '2026-09-01', day: 1, inMonth: true });
    expect(cells.at(-1)).toEqual({ key: '2026-10-04', day: 4, inMonth: false });
  });

  test('shiftMonth wraps years', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
  });
});
