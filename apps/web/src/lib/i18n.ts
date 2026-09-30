import type { Lang } from '@nutrisnap/ai';
import { type DateKey, parseDateKey } from '@nutrisnap/core';
import { getLocale, setLocale } from '@/paraglide/runtime.js';

export type AppLocale = 'en' | 'id';

export function currentLocale(): AppLocale {
  return getLocale() === 'id' ? 'id' : 'en';
}

/** Reloads the page so every message re-renders in the new language. */
export function changeLocale(locale: AppLocale): void {
  void setLocale(locale);
}

function tag(): string {
  return currentLocale() === 'id' ? 'id-ID' : 'en-US';
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(tag(), { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatDateLong(key: DateKey): string {
  return new Intl.DateTimeFormat(tag(), { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseDateKey(key),
  );
}

export function formatMonth(year: number, month0: number): string {
  return new Intl.DateTimeFormat(tag(), { month: 'long', year: 'numeric' }).format(
    new Date(year, month0, 1),
  );
}

export function formatWeekdayShort(key: DateKey): string {
  return new Intl.DateTimeFormat(tag(), { weekday: 'short' }).format(parseDateKey(key));
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat(tag(), { hour: '2-digit', minute: '2-digit' }).format(
    new Date(ms),
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / 1024 / 1024;
  const format = new Intl.NumberFormat(tag(), { maximumFractionDigits: 1 });
  return mb >= 1024 ? `${format.format(mb / 1024)} GB` : `${format.format(mb)} MB`;
}

export function aiLang(): Lang {
  return currentLocale();
}
