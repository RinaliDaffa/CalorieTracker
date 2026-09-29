import { DEFAULT_TARGETS } from '@nutrisnap/core';
import { describe, expect, test } from 'vitest';
import { addChat, clearChats, recentChats, restoreChats } from './chats';
import { addFavorite, listFavorites, restoreFavorite, softDeleteFavorite } from './favorites';
import { getMeta, setMeta } from './meta';
import { getSetting, isOnboarded, setSetting } from './settings';
import { currentTargets, setTargets } from './targets';
import { freshDb } from './test-db';

describe('settings and meta', () => {
  test('round-trip values and report onboarding', async () => {
    const d = freshDb();
    expect(await getSetting<string>(d, 'apiKey')).toBeUndefined();
    expect(await isOnboarded(d)).toBe(false);
    await setSetting(d, 'apiKey', 'k');
    await setSetting(d, 'onboarded', true);
    expect(await getSetting<string>(d, 'apiKey')).toBe('k');
    expect(await isOnboarded(d)).toBe(true);
    await setMeta(d, 'legacyImportedAt', 123);
    expect(await getMeta<number>(d, 'legacyImportedAt')).toBe(123);
  });
});

describe('targets', () => {
  test('defaults until set, and one record per effective day', async () => {
    const d = freshDb();
    expect(await currentTargets(d, '2026-09-28')).toEqual(DEFAULT_TARGETS);
    await setTargets(d, { ...DEFAULT_TARGETS, calories: 1800 }, 'manual', '2026-09-28', 1);
    await setTargets(d, { ...DEFAULT_TARGETS, calories: 1700 }, 'manual', '2026-09-28', 2);
    expect(await d.targets.count()).toBe(1);
    expect((await currentTargets(d, '2026-09-28')).calories).toBe(1700);
    expect((await currentTargets(d, '2026-09-27')).calories).toBe(2000);
  });
});

describe('favorites', () => {
  test('list newest first, delete and restore', async () => {
    const d = freshDb();
    const first = await addFavorite(d, 'Nasi goreng', [], 1);
    const second = await addFavorite(d, 'Soto', [], 2);
    expect((await listFavorites(d)).map((f) => f.id)).toEqual([second.id, first.id]);
    await softDeleteFavorite(d, second.id);
    expect((await listFavorites(d)).map((f) => f.id)).toEqual([first.id]);
    await restoreFavorite(d, second.id);
    expect(await listFavorites(d)).toHaveLength(2);
  });
});

describe('chats', () => {
  test('keep order, clear with tombstones, and restore', async () => {
    const d = freshDb();
    await addChat(d, 'user', 'hi', 1);
    await addChat(d, 'assistant', 'hello', 2);
    expect((await recentChats(d)).map((c) => c.content)).toEqual(['hi', 'hello']);
    const cleared = await clearChats(d, 3);
    expect(cleared).toHaveLength(2);
    expect(await recentChats(d)).toEqual([]);
    await restoreChats(d, cleared, 4);
    expect(await recentChats(d)).toHaveLength(2);
  });

  test('recentChats keeps only the latest messages', async () => {
    const d = freshDb();
    for (let i = 0; i < 5; i++) await addChat(d, 'user', `m${i}`, i);
    expect((await recentChats(d, 2)).map((c) => c.content)).toEqual(['m3', 'm4']);
  });
});
