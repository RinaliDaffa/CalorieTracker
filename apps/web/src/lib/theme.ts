import { useSyncExternalStore } from 'react';

export type ThemePref = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'nutrisnap-theme';
const CHANGE_EVENT = 'nutrisnap-theme-change';

export function readThemePref(): ThemePref {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'system' ? value : 'dark';
}

export function applyTheme(pref: ThemePref): void {
  localStorage.setItem(STORAGE_KEY, pref);
  const dark =
    pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#12100e' : '#f6f1e9');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function resolvedTheme(): 'dark' | 'light' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useResolvedTheme(): 'dark' | 'light' {
  return useSyncExternalStore(subscribe, resolvedTheme, () => 'dark');
}
