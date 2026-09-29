import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';
import { getMeta } from '@/db/meta';
import { getSetting, setSetting } from '@/db/settings';
import { freshDb } from '@/db/test-db';
import { importLegacyIfPresent } from './import';
import { legacyToJson, parseLegacyJson } from './json';
import { readLegacy } from './read';
import { createLegacyFixture } from './test-fixture';

let n = 0;
const legacyName = () => `legacy-${++n}`;
const makeThumb = vi.fn(async (blob: Blob) => blob);
const time = new Date(2026, 8, 20, 12, 0).getTime();

const sample = {
  meals: [
    {
      id: 'm1',
      date: '2026-09-20',
      mealType: 'lunch',
      timestamp: time,
      foodItems: [
        { name: 'Soto', servingSize: '1 mangkok', calories: 300, protein: 20, carbs: 20, fat: 15 },
      ],
      nutrition: { calories: 300, protein: 20, carbs: 20, fat: 15, fiber: 0, sugar: 0 },
      hasPhoto: true,
    },
  ],
  photos: [
    { mealId: 'm1', blob: new Blob(['jpeg-bytes'], { type: 'image/jpeg' }), timestamp: time },
  ],
  goals: [
    { id: 'current', calories: 1800, protein: 120, carbs: 200, fat: 60, fiber: 30, sugar: 50 },
  ],
  settings: [
    { key: 'apiKey', value: 'legacy-key' },
    { key: 'theme', value: 'light' },
  ],
  favorites: [{ id: 'f1', name: 'Soto', foodItems: [], nutrition: {}, createdAt: 1 }],
  chats: [{ id: 'c1', role: 'user', content: 'hi', timestamp: 2 }],
};

describe('importLegacyIfPresent', () => {
  test('does nothing, and creates nothing, when there is no legacy database', async () => {
    const d = freshDb();
    const name = legacyName();
    expect(await importLegacyIfPresent(d, { legacyName: name, makeThumb })).toEqual({
      status: 'none',
    });
    const names = (await indexedDB.databases()).map((db) => db.name);
    expect(names).not.toContain(name);
  });

  test('imports everything in one go and records it', async () => {
    const d = freshDb();
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    const onTheme = vi.fn();
    const outcome = await importLegacyIfPresent(d, {
      legacyName: name,
      makeThumb,
      onTheme,
      now: 5000,
    });
    expect(outcome).toEqual({
      status: 'imported',
      counts: { meals: 1, photos: 1, favorites: 1, chats: 1 },
    });
    const [meal] = await d.meals.toArray();
    expect(meal?.photoId).toBeDefined();
    expect(await (await d.photos.get(meal?.photoId ?? ''))?.full.text()).toBe('jpeg-bytes');
    expect((await d.targets.toArray())[0]?.values.calories).toBe(1800);
    expect(await getSetting(d, 'apiKey')).toBe('legacy-key');
    expect(await getSetting(d, 'onboarded')).toBe(true);
    expect(await getMeta(d, 'legacyImportedAt')).toBe(5000);
    expect(onTheme).toHaveBeenCalledWith('light');
  });

  test('never imports twice', async () => {
    const d = freshDb();
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    await importLegacyIfPresent(d, { legacyName: name, makeThumb });
    expect(await importLegacyIfPresent(d, { legacyName: name, makeThumb })).toEqual({
      status: 'already',
    });
    expect(await d.meals.count()).toBe(1);
  });

  test('leaves the legacy database untouched', async () => {
    const d = freshDb();
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    const before = await readLegacy(name);
    await importLegacyIfPresent(d, { legacyName: name, makeThumb });
    const after = await readLegacy(name);
    expect(after?.meals).toEqual(before?.meals);
    expect(after?.settings).toEqual(before?.settings);
  });

  test('keeps a key the user already set in the new app', async () => {
    const d = freshDb();
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    await setSetting(d, 'apiKey', 'newer-key');
    await importLegacyIfPresent(d, { legacyName: name, makeThumb });
    expect(await getSetting(d, 'apiKey')).toBe('newer-key');
  });

  test('a failure leaves no partial data', async () => {
    const d = freshDb();
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    d.targets.hook('creating', () => {
      throw new Error('boom');
    });
    const outcome = await importLegacyIfPresent(d, { legacyName: name, makeThumb });
    expect(outcome.status).toBe('failed');
    expect(await d.meals.count()).toBe(0);
    expect(await getMeta(d, 'legacyImportedAt')).toBeUndefined();
  });
});

describe('legacy JSON', () => {
  test('round-trips a dump, photos included, without the API key', async () => {
    const name = legacyName();
    await createLegacyFixture(indexedDB, name, sample);
    const dump = await readLegacy(name);
    if (!dump) throw new Error('fixture missing');
    const json = await legacyToJson(dump);
    expect(json).not.toContain('legacy-key');
    const parsed = parseLegacyJson(json);
    expect(parsed.meals).toEqual(dump.meals);
    const blob = parsed.photos[0]?.blob as Blob;
    expect(await blob.text()).toBe('jpeg-bytes');
  });

  test('rejects a file that is not a NutriSnap export', () => {
    expect(() => parseLegacyJson('{"hello":1}')).toThrow();
    expect(() => parseLegacyJson('not json')).toThrow();
  });
});
