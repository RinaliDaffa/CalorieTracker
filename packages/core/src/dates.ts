/** A calendar day in the user's local time zone, `YYYY-MM-DD`. Sorts correctly as a string. */
export type DateKey = string;

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: DateKey): Date {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Not a date key: ${key}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !KEY_PATTERN.test(value)) return false;
  return toDateKey(parseDateKey(value)) === value;
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export type WeekStart = 0 | 1;

export function weekKeys(key: DateKey, weekStartsOn: WeekStart = 1): DateKey[] {
  const offset = (parseDateKey(key).getDay() - weekStartsOn + 7) % 7;
  const start = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export interface MonthCell {
  key: DateKey;
  day: number;
  inMonth: boolean;
}

export function monthGrid(year: number, month0: number, weekStartsOn: WeekStart = 1): MonthCell[] {
  const first = toDateKey(new Date(year, month0, 1));
  const last = toDateKey(new Date(year, month0 + 1, 0));
  const start = weekKeys(first, weekStartsOn)[0] ?? first;
  const end = weekKeys(last, weekStartsOn)[6] ?? last;
  const cells: MonthCell[] = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    const date = parseDateKey(key);
    cells.push({
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month0 && date.getFullYear() === year,
    });
  }
  return cells;
}

export function shiftMonth(
  year: number,
  month0: number,
  delta: number,
): { year: number; month0: number } {
  const date = new Date(year, month0 + delta, 1);
  return { year: date.getFullYear(), month0: date.getMonth() };
}
